-- ═══════════════════════════════════════════════════════════════
-- Business logic that must be atomic lives in the database.
-- ═══════════════════════════════════════════════════════════════

-- ── New account bootstrap: settings, the 10 services, stock categories ──
create or replace function public.bootstrap_owner(p_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into salon_settings (owner_id) values (p_owner) on conflict do nothing;

  if not exists (select 1 from services where owner_id = p_owner) then
    insert into services (owner_id, name, category, price, duration_minutes, color, sort_order) values
      (p_owner, 'Vernis semi-permanent main',      'Semi-permanent', 15, 45,  '#F4A6C6', 1),
      (p_owner, 'Vernis semi-permanent renforcé',  'Semi-permanent', 20, 60,  '#F08BB4', 2),
      (p_owner, 'Dépose + repose vernis semi',     'Semi-permanent', 30, 75,  '#E879A6', 3),
      (p_owner, 'Dépose seule',                    'Dépose',         10, 20,  '#D9A3AB', 4),
      (p_owner, 'Gainage',                         'Gel',            25, 60,  '#C88792', 5),
      (p_owner, 'Pose gel complète',               'Gel',            35, 120, '#B76E79', 6),
      (p_owner, 'Pose américaine (Gel X)',         'Gel',            30, 90,  '#E3B5A4', 7),
      (p_owner, 'Remplissage 3 semaines',          'Gel',            30, 90,  '#EBD3BC', 8),
      (p_owner, 'Dépose gel',                      'Dépose',         15, 30,  '#CFB1B7', 9),
      (p_owner, 'Pose chablon',                    'Gel',            30, 120, '#A85F6C', 10);
  end if;

  insert into stock_categories (owner_id, name, sort_order)
  select p_owner, c.name, c.ord
  from unnest(array['Builder Gel','Top Coat','Primer','Polish','Tips','Brushes','Glitter','Chrome',
                    'Decorations','Files','Buffers','Lamps','Accessories']) with ordinality as c(name, ord)
  on conflict (owner_id, name) do nothing;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.bootstrap_owner(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Manual stock adjustment with movement history ──
create or replace function public.adjust_stock(
  p_product_id uuid, p_delta numeric, p_reason stock_reason default 'adjustment', p_note text default null
) returns public.products
language plpgsql security invoker set search_path = public as $$
declare v_product products;
begin
  update products set quantity = greatest(quantity + p_delta, 0)
  where id = p_product_id and owner_id = auth.uid()
  returning * into v_product;
  if v_product.id is null then raise exception 'Product not found'; end if;
  insert into stock_movements (owner_id, product_id, delta, reason, note)
  values (auth.uid(), p_product_id, p_delta, p_reason, p_note);
  return v_product;
end $$;

-- ── Complete an appointment ──
-- 1. deducts every configured product (service rules + per-nail / per-strass add-on rules)
-- 2. computes real product cost → profit
-- 3. marks paid, redeems gift card, awards loyalty points
-- 4. issues a numbered invoice
create or replace function public.complete_appointment(
  p_appointment_id uuid,
  p_payment_method payment_method default 'card',
  p_mark_paid boolean default true
) returns public.appointments
language plpgsql security invoker set search_path = public as $$
declare
  v_appt      appointments;
  v_settings  salon_settings;
  v_service   services;
  v_rule      record;
  v_qty       numeric;
  v_cost      numeric := 0;
  v_items     jsonb := '[]'::jsonb;
  v_number    text;
begin
  select * into v_appt from appointments where id = p_appointment_id and owner_id = auth.uid() for update;
  if v_appt.id is null then raise exception 'Appointment not found'; end if;
  if v_appt.status = 'completed' then return v_appt; end if;
  if v_appt.status = 'cancelled' then raise exception 'A cancelled appointment cannot be completed'; end if;

  select * into v_settings from salon_settings where owner_id = auth.uid() for update;
  select * into v_service  from services where id = v_appt.service_id;

  -- products already logged by hand for this appointment count toward cost
  select coalesce(sum(quantity * unit_cost), 0) into v_cost
  from appointment_products where appointment_id = v_appt.id;

  for v_rule in
    select r.*, p.name as product_name, p.purchase_price
    from consumption_rules r join products p on p.id = r.product_id
    where r.owner_id = auth.uid()
      and (r.service_id = v_appt.service_id
           or (r.addon = 'french'      and v_appt.french)
           or (r.addon = 'nail_art'    and v_appt.nail_art_count > 0)
           or (r.addon = 'complex_art' and v_appt.complex_art_count > 0)
           or (r.addon = 'strass'      and v_appt.strass_count > 0))
  loop
    v_qty := v_rule.quantity * case v_rule.addon
               when 'nail_art'    then v_appt.nail_art_count
               when 'complex_art' then v_appt.complex_art_count
               when 'strass'      then v_appt.strass_count
               else 1 end;

    insert into appointment_products (owner_id, appointment_id, product_id, product_name, quantity, unit_cost)
    values (auth.uid(), v_appt.id, v_rule.product_id, v_rule.product_name, v_qty, v_rule.purchase_price);

    update products set quantity = greatest(quantity - v_qty, 0) where id = v_rule.product_id;

    insert into stock_movements (owner_id, product_id, delta, reason, appointment_id, note)
    values (auth.uid(), v_rule.product_id, -v_qty, 'appointment', v_appt.id, 'Auto deduction');

    v_cost := v_cost + v_qty * v_rule.purchase_price;
  end loop;

  -- gift card redemption
  if p_mark_paid and p_payment_method = 'gift_card' and v_appt.gift_card_id is not null then
    update gift_cards set balance = greatest(balance - v_appt.total_price, 0)
    where id = v_appt.gift_card_id and owner_id = auth.uid();
  end if;

  update appointments set
    status         = 'completed',
    completed_at   = now(),
    product_cost   = round(v_cost, 2),
    payment_method = p_payment_method,
    payment_status = case when p_mark_paid then 'paid'::payment_status else payment_status end,
    paid_at        = case when p_mark_paid then now() else paid_at end
  where id = v_appt.id
  returning * into v_appt;

  -- loyalty
  if v_appt.client_id is not null then
    update clients
      set loyalty_points = loyalty_points + floor(v_appt.total_price * v_settings.loyalty_points_per_euro)::int
    where id = v_appt.client_id;
  end if;

  -- invoice
  v_items := jsonb_build_array(jsonb_build_object(
    'label', coalesce(v_service.name, 'Prestation'), 'quantity', 1,
    'unit_price', v_appt.service_price, 'total', v_appt.service_price));
  if v_appt.french then
    v_items := v_items || jsonb_build_object('label','French','quantity',1,
      'unit_price', v_settings.price_french, 'total', v_settings.price_french);
  end if;
  if v_appt.nail_art_count > 0 then
    v_items := v_items || jsonb_build_object('label','Nail art','quantity',v_appt.nail_art_count,
      'unit_price', v_settings.price_nail_art, 'total', v_appt.nail_art_count * v_settings.price_nail_art);
  end if;
  if v_appt.complex_art_count > 0 then
    v_items := v_items || jsonb_build_object('label','Nail art complexe','quantity',v_appt.complex_art_count,
      'unit_price', v_settings.price_complex_art, 'total', v_appt.complex_art_count * v_settings.price_complex_art);
  end if;
  if v_appt.strass_count > 0 then
    v_items := v_items || jsonb_build_object('label','Strass','quantity',v_appt.strass_count,
      'unit_price', v_settings.price_strass, 'total', v_appt.strass_count * v_settings.price_strass);
  end if;

  v_number := v_settings.invoice_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(v_settings.next_invoice_number::text, 4, '0');
  update salon_settings set next_invoice_number = next_invoice_number + 1 where owner_id = auth.uid();

  insert into invoices (owner_id, appointment_id, client_id, number, items, subtotal, discount, total, payment_method, paid)
  values (auth.uid(), v_appt.id, v_appt.client_id, v_number, v_items,
          v_appt.service_price + v_appt.extras_total, v_appt.discount, v_appt.total_price,
          p_payment_method, p_mark_paid)
  on conflict (appointment_id) do nothing;

  return v_appt;
end $$;

-- ── Activity log triggers (feed + notifications) ──
create or replace function public.log_appointment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client text; v_when text;
begin
  select trim(first_name || ' ' || last_name) into v_client from clients where id = new.client_id;
  v_client := coalesce(v_client, 'Client');
  v_when := to_char(new.start_at at time zone 'Europe/Paris', 'DD/MM HH24:MI');

  if tg_op = 'INSERT' then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
    values (new.owner_id, 'appointment_created', 'New appointment',
            v_client || ' · ' || v_when || case when new.source = 'calendly' then ' (Calendly)' else '' end,
            'appointment', new.id);
  elsif new.status is distinct from old.status and new.status in ('completed','cancelled') then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
    values (new.owner_id, 'appointment_' || new.status::text,
            case when new.status = 'completed' then 'Appointment completed' else 'Appointment cancelled' end,
            v_client || ' · ' || v_when, 'appointment', new.id);
  end if;

  if tg_op = 'UPDATE' and new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
    values (new.owner_id, 'payment_received', 'Payment received',
            v_client || ' · ' || to_char(new.total_price, 'FM999G990D00') || ' €', 'appointment', new.id);
  end if;
  return new;
end $$;
create trigger trg_appointments_activity after insert or update on public.appointments
  for each row execute function public.log_appointment_activity();

create or replace function public.log_low_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.quantity <= new.min_quantity and old.quantity > old.min_quantity then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
    values (new.owner_id, 'low_stock', 'Low stock',
            new.name || ' · ' || new.quantity || ' left (min ' || new.min_quantity || ')', 'product', new.id);
  end if;
  return new;
end $$;
create trigger trg_products_low_stock after update of quantity, min_quantity on public.products
  for each row execute function public.log_low_stock();

create or replace function public.log_client_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
  values (new.owner_id, 'client_created', 'New client', trim(new.first_name || ' ' || new.last_name), 'client', new.id);
  return new;
end $$;
create trigger trg_clients_activity after insert on public.clients
  for each row execute function public.log_client_created();

create or replace function public.log_review_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into activity_log (owner_id, type, title, description, entity_type, entity_id)
  values (new.owner_id, 'review_added', 'New review ' || repeat('★', new.rating), new.author_name, 'review', new.id);
  return new;
end $$;
create trigger trg_reviews_activity after insert on public.reviews
  for each row execute function public.log_review_added();

-- Bootstrap any users that existed before this migration ran
do $$ declare u record; begin
  for u in select id from auth.users loop perform public.bootstrap_owner(u.id); end loop;
end $$;
