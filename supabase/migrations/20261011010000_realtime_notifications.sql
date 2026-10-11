-- ═══════════════════════════════════════════════════════════════
-- Live dashboard + booking notifications.
-- ═══════════════════════════════════════════════════════════════

-- 1. Was the change made by the salon in the app (a signed-in request) or by a
--    webhook / sync (no user session: Calendly, Google)? Only external events ring.
alter table public.activity_log add column if not exists external boolean not null default false;

create or replace function public.log_appointment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client text; v_when text; v_external boolean := auth.uid() is null;
begin
  select trim(first_name || ' ' || last_name) into v_client from clients where id = new.client_id;
  v_client := coalesce(v_client, 'Client');
  v_when := to_char(new.start_at at time zone 'Europe/Paris', 'DD/MM HH24:MI');

  if tg_op = 'INSERT' then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id, external)
    values (new.owner_id, 'appointment_created', 'New appointment',
            v_client || ' · ' || v_when || case when new.source = 'calendly' then ' (Calendly)' else '' end,
            'appointment', new.id, v_external);
  elsif new.status is distinct from old.status and new.status in ('completed','cancelled') then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id, external)
    values (new.owner_id, 'appointment_' || new.status::text,
            case when new.status = 'completed' then 'Appointment completed' else 'Appointment cancelled' end,
            v_client || ' · ' || v_when, 'appointment', new.id, v_external);
  end if;

  if tg_op = 'UPDATE' and new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into activity_log (owner_id, type, title, description, entity_type, entity_id, external)
    values (new.owner_id, 'payment_received', 'Payment received',
            v_client || ' · ' || to_char(new.total_price, 'FM999G990D00') || ' €', 'appointment', new.id, v_external);
  end if;
  return new;
end $$;

-- 2. Supabase Realtime: stream these tables to signed-in clients (RLS still applies per owner).
do $$
declare t text;
begin
  foreach t in array array['appointments', 'activity_log', 'expenses'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; -- already published
    end;
  end loop;
end $$;

-- 3. Atomic merge into integrations.settings, so the webhook, the cron and the in-app
--    sync can each record their timestamps without overwriting each other's keys.
create or replace function public.merge_integration_settings(p_owner uuid, p_provider text, p_patch jsonb)
returns jsonb language sql security definer set search_path = public as $$
  update integrations set settings = coalesce(settings, '{}'::jsonb) || p_patch
  where owner_id = p_owner and provider = p_provider
  returning settings;
$$;
revoke execute on function public.merge_integration_settings(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.merge_integration_settings(uuid, text, jsonb) to service_role;
