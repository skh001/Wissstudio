-- ═══════════════════════════════════════════════════════════════
-- Row Level Security: each owner only ever sees their own rows.
-- ═══════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array[
    'salon_settings','services','clients','appointments','stock_categories','products',
    'consumption_rules','appointment_products','stock_movements','expenses','invoices',
    'gift_cards','gallery_items','reviews','activity_log','integrations'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_owner_all" on public.%I for all to authenticated
                    using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- OAuth tokens are only readable with the service role (server code), never from the browser.
-- (Column-level REVOKE is ignored while a table-level grant exists, so the table grant is replaced
--  by an explicit column list.)
revoke all on public.integrations from authenticated, anon;
grant select (owner_id, provider, account_email, settings, connected_at, updated_at, expires_at)
  on public.integrations to authenticated;
grant delete on public.integrations to authenticated;

-- ── Storage: one public "media" bucket, files stored under "<owner_id>/..." ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/gif'])
on conflict (id) do nothing;

create policy "media_public_read" on storage.objects for select
  using (bucket_id = 'media');
create policy "media_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
