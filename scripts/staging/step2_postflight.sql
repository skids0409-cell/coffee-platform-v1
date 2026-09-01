\set ON_ERROR_STOP on

do $$
declare
  v_count integer;
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'PostgreSQL 17+ required';
  end if;

  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');
  if v_count <> 0 then
    raise exception 'dangerous_grant_count=%; expected 0', v_count;
  end if;

  select count(*) into v_count
  from pg_proc as p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in (
      'admin_validate_taxonomy_change',
      'admin_upsert_category',
      'admin_upsert_field_definition',
      'admin_replace_category_filters',
      'admin_transition_taxonomy_status'
    )
    and not p.prosecdef
    and p.proconfig @> array['search_path=""']
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and not has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_count <> 5 then
    raise exception 'governed_rpc_count=%; expected 5', v_count;
  end if;

  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and policyname like 'step2\_%\_admin\_%' escape '\'
    and tablename in ('categories', 'field_definitions', 'filter_definitions');
  if v_count <> 7 then
    raise exception 'taxonomy_admin_policy_count=%; expected 7', v_count;
  end if;

  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where name = 'step2_privilege_taxonomy_governance'
  ) or not exists (
    select 1 from supabase_migrations.schema_migrations
    where name = 'step2_taxonomy_admin_rpc'
  ) then
    raise exception 'STEP2 migrations are not both registered';
  end if;
end
$$;

select
  current_setting('server_version') as server_version,
  0::integer as dangerous_grant_count,
  5::integer as governed_rpc_count,
  7::integer as taxonomy_admin_policy_count,
  'STEP2_REMOTE_POSTFLIGHT_PASSED'::text as result;
