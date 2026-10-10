-- ═══════════════════════════════════════════════════════════════
-- Security hardening: SECURITY DEFINER helpers must not be callable
-- through the public API by anonymous visitors.
-- (Postgres grants EXECUTE to PUBLIC by default; Supabase also grants it to anon/authenticated.)
-- ═══════════════════════════════════════════════════════════════

-- Only used by the signup trigger and by seed_demo_data (which runs as the function owner).
revoke execute on function public.bootstrap_owner(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- "Load demo data" is a signed-in action, and only ever on the caller's own account.
revoke execute on function public.seed_demo_data(uuid) from public, anon;
grant execute on function public.seed_demo_data(uuid) to authenticated;

-- Business functions run with the caller's rights (RLS applies) but need a session anyway.
revoke execute on function public.complete_appointment(uuid, payment_method, boolean) from public, anon;
grant execute on function public.complete_appointment(uuid, payment_method, boolean) to authenticated;
revoke execute on function public.adjust_stock(uuid, numeric, stock_reason, text) from public, anon;
grant execute on function public.adjust_stock(uuid, numeric, stock_reason, text) to authenticated;
