-- Coffee Platform V1 — bootstrap the first owner administrator
-- Version: 1.0.0 | Date: 2026-08-09
-- Safety rule: succeeds only when exactly one Supabase Auth user exists.

begin;

do $$
declare
  auth_user_count integer;
  owner_user_id uuid;
  owner_display_name text;
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Migration 001 must be completed before 004';
  end if;

  select count(*) into auth_user_count from auth.users;

  if auth_user_count <> 1 then
    raise exception 'Expected exactly one Auth user, but found %. No role was changed.', auth_user_count;
  end if;

  select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')
  into owner_user_id, owner_display_name
  from auth.users
  limit 1;

  insert into public.profiles (id, display_name, role, is_active)
  values (owner_user_id, owner_display_name, 'admin', true)
  on conflict (id) do update set
    role = 'admin',
    is_active = true,
    display_name = coalesce(public.profiles.display_name, excluded.display_name);

  insert into public.audit_events (actor_user_id, action, entity_table, entity_id, after_data, source)
  values (
    owner_user_id,
    'bootstrap_owner_admin',
    'profiles',
    owner_user_id::text,
    jsonb_build_object('role', 'admin', 'is_active', true),
    'migration_004'
  );
end $$;

commit;

select
  count(*) filter (where role = 'admin') as admin_profiles,
  count(*) filter (where role = 'admin' and is_active) as active_admin_profiles,
  case when count(*) filter (where role = 'admin' and is_active) = 1 then 'READY' else 'CHECK' end as admin_status
from public.profiles;
