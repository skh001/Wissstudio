-- Local development seed: creates a demo login and fills it with realistic data.
--   email:    wiss@wissnails.fr
--   password: wissnails123
do $$
declare v_uid uuid := '6b1f0a52-5a3c-4c9e-9f3a-2f8a1d1e7c11';
begin
  if not exists (select 1 from auth.users where id = v_uid) then
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', 'wiss@wissnails.fr',
      crypt('wissnails123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{"name":"Wiss"}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', 'wiss@wissnails.fr', 'email_verified', true),
      'email', now(), now(), now());
  end if;
  perform public.seed_demo_data(v_uid);
end $$;
