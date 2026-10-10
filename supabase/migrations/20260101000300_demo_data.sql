-- ═══════════════════════════════════════════════════════════════
-- Demo data generator. Called by seed.sql locally, and from
-- Settings → Data → "Load demo data" (only on an empty account).
-- Deterministic: the same seed always produces the same data.
-- ═══════════════════════════════════════════════════════════════
create or replace function public.seed_demo_data(p_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_day       date;
  v_slot      int;
  v_n         int;
  v_client    uuid;
  v_service   record;
  v_start     timestamptz;
  v_art       int;
  v_strass    int;
  v_french    boolean;
  v_extras    numeric;
  v_status    appointment_status;
  v_clients   uuid[];
  v_cat       uuid;
  v_gel       uuid; v_top uuid; v_primer uuid; v_file uuid; v_tips uuid; v_strass_p uuid; v_polish uuid;
begin
  if auth.uid() is not null and auth.uid() <> p_owner then
    raise exception 'Not allowed';
  end if;
  if exists (select 1 from clients where owner_id = p_owner) then
    raise exception 'Demo data can only be loaded on an empty account';
  end if;

  perform bootstrap_owner(p_owner);
  perform setseed(0.42);

  update salon_settings set
    address = '12 rue Lenepveu, 49100 Angers', phone = '06 12 34 56 78', email = 'hello@wissnails.fr',
    socials = '{"instagram": "@wissnails", "tiktok": "@wissnails", "facebook": "", "website": "https://wissnails.fr"}'
  where owner_id = p_owner;

  -- ── Products ──
  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Builder Gel';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location, barcode)
  values (p_owner, v_cat, 'Builder gel Clear 50 ml', 'Indigo', 'Indigo Nails', 0.62, 'ml', 120, 40, 'Étagère A1', '5901234123457') returning id into v_gel;
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Builder gel Milky Pink', 'Indigo', 'Indigo Nails', 0.68, 'ml', 30, 40, 'Étagère A1');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Top Coat';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Top coat No Wipe 15 ml', 'The Gel Bottle', 'TGB', 1.20, 'ml', 45, 15, 'Étagère A2') returning id into v_top;

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Primer';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Primer sans acide', 'Indigo', 'Indigo Nails', 1.10, 'ml', 8, 10, 'Étagère A2') returning id into v_primer;

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Polish';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Semi-permanent Rose Ballerine', 'Manucurist', 'Manucurist', 0.95, 'ml', 22, 10, 'Tiroir B1') returning id into v_polish;
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location) values
    (p_owner, v_cat, 'Semi-permanent Rouge Couture', 'Manucurist', 'Manucurist', 0.95, 'ml', 18, 10, 'Tiroir B1'),
    (p_owner, v_cat, 'Semi-permanent Nude Satin', 'Manucurist', 'Manucurist', 0.95, 'ml', 26, 10, 'Tiroir B1');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Tips';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Capsules Gel X amande (boîte 500)', 'Apres', 'Amazon', 0.04, 'unit', 640, 200, 'Tiroir B2') returning id into v_tips;

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Files';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Lime 100/180 jetable', 'Staleks', 'Staleks', 0.35, 'unit', 60, 30, 'Tiroir C1') returning id into v_file;

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Buffers';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Polissoir 4 faces', 'Staleks', 'Staleks', 0.40, 'unit', 14, 20, 'Tiroir C1');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Decorations';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Strass cristal SS6', 'Swarovski', 'Bijoux Ongles', 0.06, 'unit', 1400, 300, 'Boîte D1') returning id into v_strass_p;

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Chrome';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Poudre chrome perle', 'Indigo', 'Indigo Nails', 0.30, 'g', 6, 2, 'Boîte D2');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Glitter';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Paillettes rose gold', 'Born Pretty', 'AliExpress', 0.20, 'g', 15, 5, 'Boîte D2');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Brushes';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Pinceau liner 7 mm', 'Kolinsky', 'Bijoux Ongles', 6.50, 'unit', 3, 2, 'Pot E1');

  select id into v_cat from stock_categories where owner_id = p_owner and name = 'Lamps';
  insert into products (owner_id, category_id, name, brand, supplier, purchase_price, unit, quantity, min_quantity, location)
  values (p_owner, v_cat, 'Lampe UV/LED 48 W', 'Sunuv', 'Amazon', 39.00, 'unit', 2, 1, 'Poste 1');

  -- ── Automatic consumption rules ──
  insert into consumption_rules (owner_id, service_id, product_id, quantity)
  select p_owner, s.id, r.product_id, r.qty
  from services s
  cross join lateral (values
      (v_primer, 0.3::numeric), (v_top, 0.8::numeric), (v_file, 1::numeric)
  ) as r(product_id, qty)
  where s.owner_id = p_owner and s.name not ilike 'Dépose seule' and s.name not ilike 'Dépose gel';

  insert into consumption_rules (owner_id, service_id, product_id, quantity)
  select p_owner, s.id, v_gel, case when s.name ilike '%remplissage%' then 2.5 else 4 end
  from services s where s.owner_id = p_owner and s.category = 'Gel';

  insert into consumption_rules (owner_id, service_id, product_id, quantity)
  select p_owner, s.id, v_polish, 1.5 from services s
  where s.owner_id = p_owner and s.category = 'Semi-permanent';

  insert into consumption_rules (owner_id, service_id, product_id, quantity)
  select p_owner, s.id, v_tips, 10 from services s
  where s.owner_id = p_owner and s.name ilike '%gel x%';

  insert into consumption_rules (owner_id, addon, product_id, quantity) values
    (p_owner, 'strass', v_strass_p, 1);

  -- ── Clients ──
  with c(first_name, last_name, phone, email, instagram, birthday, color, shape, length, style, vip, fav, tags, allergies) as (values
    ('Inès',    'Moreau',   '06 11 22 33 44', 'ines.moreau@gmail.com',   '@ines.mr',      date '1996-03-14', 'Nude rosé', 'Amande', 'Moyen', 'Babyboomer', true,  true,  array['fidèle'], null),
    ('Camille', 'Lefèvre',  '06 22 33 44 55', 'camille.lefevre@gmail.com','@camille.lfv', date '1992-07-02', 'Rouge',     'Carré',  'Court', 'Classique',  false, true,  array['mariage 2026'], null),
    ('Sarah',   'Benali',   '07 45 12 89 30', 'sarah.benali@outlook.fr', '@sarahbnl',     date '1999-11-21', 'Chrome',    'Stiletto','Long', 'Luxe',       true,  false, array['nail art'], 'Sensible au HEMA'),
    ('Léa',     'Dubois',   '06 98 76 54 32', 'lea.dubois@free.fr',      null,            date '2001-01-09', 'Pastel',    'Ovale',  'Court', 'Minimaliste',false, false, '{}', null),
    ('Manon',   'Girard',   '06 55 44 33 22', 'manon.girard@gmail.com',  '@manon.grd',    date '1994-05-30', 'French',    'Amande', 'Moyen', 'French',     false, false, '{}', null),
    ('Yasmine', 'Haddad',   '07 12 34 56 78', 'yasmine.h@gmail.com',     '@yas.nails.love',date '1997-09-17','Lilas',     'Coffin', 'Long',  'Nail art',   true,  true,  array['influenceuse'], null),
    ('Chloé',   'Martin',   '06 87 65 43 21', 'chloe.martin@sfr.fr',     null,            date '1989-12-03', 'Bordeaux',  'Carré arrondi','Court','Classique',false,false,'{}', null),
    ('Emma',    'Rousseau', '06 34 56 78 90', 'emma.rousseau@gmail.com', '@emmarsso',     date '2003-04-25', 'Rose bonbon','Amande','Moyen', 'Cute',       false, false, array['étudiante'], null),
    ('Nora',    'Chevalier','07 66 55 44 33', 'nora.chevalier@gmail.com','@nora.chvl',    date '1991-08-12', 'Nude',      'Ovale',  'Court', 'Minimaliste',false, false, '{}', 'Allergie latex'),
    ('Jade',    'Fontaine', '06 21 43 65 87', 'jade.fontaine@yahoo.fr',  '@jadefnt',      date '1998-02-28', 'Glitter',   'Stiletto','Long', 'Luxe',       false, false, '{}', null),
    ('Lina',    'Bernard',  '06 13 57 91 13', 'lina.bernard@gmail.com',  null,            date '2000-06-06', 'Blanc',     'Carré',  'Moyen', 'French',     false, false, '{}', null),
    ('Zoé',     'Laurent',  '07 24 68 02 46', 'zoe.laurent@gmail.com',   '@zoe.lrt',      date '1995-10-10', 'Vert sauge','Amande', 'Court', 'Minimaliste',false, false, '{}', null)
  )
  insert into clients (owner_id, first_name, last_name, phone, email, instagram, birthday, favorite_color,
                       favorite_shape, favorite_length, favorite_style, is_vip, is_favorite, tags, allergies, preferred_technician, created_at)
  select p_owner, first_name, last_name, phone, email, instagram, birthday, color, shape, length, style, vip, fav, tags, allergies, 'Wiss',
         now() - (random() * 200 + 30) * interval '1 day'
  from c;

  select array_agg(id order by created_at) into v_clients from clients where owner_id = p_owner;

  -- ── Appointments: ~6 months of history + 2 weeks ahead ──
  for v_day in select generate_series(current_date - 180, current_date + 14, interval '1 day')::date loop
    continue when extract(isodow from v_day) = 7;
    v_n := floor(random() * 4)::int + case when extract(isodow from v_day) = 6 then 1 else 0 end;
    for v_slot in 0 .. v_n - 1 loop
      select * into v_service from services where owner_id = p_owner order by random() limit 1;
      -- the first clients are the regulars: skew the choice toward them
      v_client := v_clients[1 + floor(power(random(), 1.6) * array_length(v_clients, 1))::int];
      v_start  := (v_day + time '09:30' + (v_slot * interval '2 hours')) at time zone 'Europe/Paris';
      v_french := random() < 0.2;
      v_art    := case when random() < 0.25 then floor(random() * 5 + 1)::int else 0 end;
      v_strass := case when random() < 0.2  then floor(random() * 8 + 2)::int else 0 end;
      v_extras := (case when v_french then 5 else 0 end) + v_art * 1 + v_strass * 1;
      v_status := case
        when v_day < current_date then case when random() < 0.06 then 'cancelled' else 'completed' end
        when v_day = current_date and v_slot = 0 then 'completed'
        when random() < 0.25 then 'pending' else 'confirmed' end;

      insert into appointments (owner_id, client_id, service_id, start_at, end_at, status, technician,
        french, nail_art_count, strass_count, service_price, extras_total, total_price, product_cost,
        payment_status, payment_method, paid_at, completed_at, cancelled_at, source, created_at)
      values (p_owner, v_client, v_service.id, v_start, v_start + make_interval(mins => v_service.duration_minutes),
        v_status, 'Wiss', v_french, v_art, v_strass, v_service.price, v_extras, v_service.price + v_extras,
        case when v_status = 'completed' then round((v_service.price * 0.11 + v_strass * 0.06)::numeric, 2) else 0 end,
        case when v_status = 'completed' then 'paid'::payment_status else 'unpaid'::payment_status end,
        case when v_status = 'completed' then (array['card','cash','card','transfer']::payment_method[])[1 + floor(random()*4)::int] end,
        case when v_status = 'completed' then v_start + interval '1 hour' end,
        case when v_status = 'completed' then v_start + interval '1 hour' end,
        case when v_status = 'cancelled' then v_start - interval '1 day' end,
        case when random() < 0.35 then 'calendly'::appointment_source else 'dashboard'::appointment_source end,
        v_start - interval '6 days');
    end loop;
  end loop;

  -- loyalty points reflect history
  update clients c set loyalty_points = coalesce((
    select floor(sum(total_price))::int from appointments a where a.client_id = c.id and a.status = 'completed'), 0)
  where c.owner_id = p_owner;

  -- invoices for completed appointments
  insert into invoices (owner_id, appointment_id, client_id, number, issued_at, items, subtotal, total, payment_method, paid)
  select p_owner, a.id, a.client_id,
         'WN-' || to_char(a.completed_at, 'YYYY') || '-' || lpad(row_number() over (order by a.completed_at)::text, 4, '0'),
         a.completed_at,
         jsonb_build_array(jsonb_build_object('label', s.name, 'quantity', 1, 'unit_price', a.service_price, 'total', a.service_price))
           || case when a.extras_total > 0 then jsonb_build_array(jsonb_build_object('label','Options nail art','quantity',1,'unit_price',a.extras_total,'total',a.extras_total)) else '[]'::jsonb end,
         a.total_price, a.total_price, a.payment_method, true
  from appointments a join services s on s.id = a.service_id
  where a.owner_id = p_owner and a.status = 'completed';
  update salon_settings set next_invoice_number = (select count(*) + 1 from invoices where owner_id = p_owner)
  where owner_id = p_owner;

  -- ── Expenses (monthly fixed + product restocks) ──
  insert into expenses (owner_id, category, label, amount, date, supplier)
  select p_owner, e.category::expense_category, e.label, e.amount, (date_trunc('month', m) + e.day_offset * interval '1 day')::date, e.supplier
  from generate_series(date_trunc('month', current_date) - interval '5 months', date_trunc('month', current_date), interval '1 month') m
  cross join (values
    ('rent', 'Loyer cabine', 350.00, 0, 'SCI Lenepveu'),
    ('electricity', 'Électricité', 42.00, 4, 'EDF'),
    ('subscriptions', 'Calendly Standard', 12.00, 2, 'Calendly'),
    ('subscriptions', 'Forfait téléphone', 15.99, 7, 'Free'),
    ('products', 'Réassort gels & semi', 95.00, 12, 'Indigo Nails'),
    ('advertising', 'Sponsorisation Instagram', 30.00, 15, 'Meta')
  ) as e(category, label, amount, day_offset, supplier)
  where (date_trunc('month', m) + e.day_offset * interval '1 day')::date <= current_date;

  insert into expenses (owner_id, category, label, amount, date, supplier) values
    (p_owner, 'training',  'Formation nail art avancé', 280, current_date - 120, 'Nail Academy Nantes'),
    (p_owner, 'furniture', 'Table de manucure', 189, current_date - 160, 'IKEA'),
    (p_owner, 'equipment', 'Ponceuse électrique', 79, current_date - 75, 'Amazon'),
    (p_owner, 'miscellaneous', 'Serviettes & lingettes', 24.5, current_date - 20, 'Action');

  -- ── Reviews ──
  insert into reviews (owner_id, source, author_name, rating, comment, review_date, client_id) values
    (p_owner, 'google', 'Inès M.',   5, 'Toujours parfait, ma pose tient 4 semaines sans un éclat. Wiss est adorable.', current_date - 3, v_clients[1]),
    (p_owner, 'google', 'Camille L.',5, 'Ongles de mariage magnifiques, exactement ce que je voulais.', current_date - 12, v_clients[2]),
    (p_owner, 'manual', 'Sarah B.',  5, 'Le chrome est sublime, et elle a fait attention à mon allergie.', current_date - 25, v_clients[3]),
    (p_owner, 'google', 'Léa D.',    4, 'Très beau travail, juste un peu de retard sur le rendez-vous.', current_date - 40, v_clients[4]),
    (p_owner, 'instagram','Yasmine H.',5,'Mes clientes me demandent toujours où je fais mes ongles !', current_date - 55, v_clients[6]),
    (p_owner, 'google', 'Emma R.',   5, 'Salon tout doux, prix honnêtes, je recommande.', current_date - 70, v_clients[8]);

  -- ── Gift card ──
  insert into gift_cards (owner_id, code, initial_amount, balance, purchaser_name, recipient_name, expires_at)
  values (p_owner, 'WISS-ROSE-2026', 50, 50, 'Thomas R.', 'Emma Rousseau', current_date + 300);

  -- clear the seed noise from the activity feed and keep a clean, recent one
  delete from activity_log where owner_id = p_owner;
  insert into activity_log (owner_id, type, title, description, created_at) values
    (p_owner, 'review_added', 'New review ★★★★★', 'Inès M.', now() - interval '3 hours'),
    (p_owner, 'payment_received', 'Payment received', 'Morning appointment · paid by card', now() - interval '2 hours'),
    (p_owner, 'low_stock', 'Low stock', 'Primer sans acide · 8 left (min 10)', now() - interval '1 hour');
end $$;

revoke execute on function public.seed_demo_data(uuid) from anon;
