-- Coffee Platform V1 — STEP2 privilege and taxonomy governance
-- Scope: P0 privilege hardening and admin-only taxonomy lifecycle controls.

begin;

do $$
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'Migration 032 requires PostgreSQL 17 or newer';
  end if;
  if to_regprocedure('private.normalize_search_text(text)') is null
     or to_regclass('public.offers_market_reference_price_idx') is null
     or not exists (
       select 1
       from information_schema.columns
       where table_schema = 'public'
         and table_name = 'offers'
         and column_name = 'reference_price_iqd'
     ) then
    raise exception 'STEP1 migration 031 is not fully installed';
  end if;
  if (
    select count(*)
    from public.filter_definitions as fd
    join public.categories as c on c.id = fd.category_id
    join public.field_definitions as f on f.id = fd.field_definition_id
    where c.code = 'EQP-MCH-FLT'
      and f.code in (
        'brand_id', 'brew_capacity_l', 'carafe_type', 'programmable',
        'sca_certified', 'application', 'market_price', 'availability'
      )
  ) <> 8 then
    raise exception 'STEP1 taxonomy compatibility patch is incomplete';
  end if;
end
$$;

-- RLS does not protect TRUNCATE. Remove non-application privileges inherited
-- from historical Supabase defaults, and prevent them on future public tables.
revoke truncate, trigger, references
  on all tables in schema public
  from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke truncate, trigger, references on tables
  from anon, authenticated;

-- Taxonomy reads remain available through existing published/staff policies.
-- Writes become admin-only. Categories and fields are archived, never deleted
-- through the Data API.
drop policy if exists step1_authenticated_insert_categories_f82598e3
  on public.categories;
drop policy if exists step1_authenticated_update_categories_793223bb
  on public.categories;
drop policy if exists step1_authenticated_delete_categories_7db9f989
  on public.categories;

drop policy if exists step1_authenticated_insert_field_definitions_649312c3
  on public.field_definitions;
drop policy if exists step1_authenticated_update_field_definitions_ae6ba538
  on public.field_definitions;
drop policy if exists step1_authenticated_delete_field_definitions_c662d550
  on public.field_definitions;

drop policy if exists step1_authenticated_insert_filter_definitions_ff29e866
  on public.filter_definitions;
drop policy if exists step1_authenticated_update_filter_definitions_78b44167
  on public.filter_definitions;
drop policy if exists step1_authenticated_delete_filter_definitions_338b9bc7
  on public.filter_definitions;

create policy step2_categories_admin_insert
  on public.categories for insert to authenticated
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );
create policy step2_categories_admin_update
  on public.categories for update to authenticated
  using (
    (select private.is_staff(array['admin']::public.staff_role[]))
  )
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );

create policy step2_field_definitions_admin_insert
  on public.field_definitions for insert to authenticated
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );
create policy step2_field_definitions_admin_update
  on public.field_definitions for update to authenticated
  using (
    (select private.is_staff(array['admin']::public.staff_role[]))
  )
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );

create policy step2_filter_definitions_admin_insert
  on public.filter_definitions for insert to authenticated
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );
create policy step2_filter_definitions_admin_update
  on public.filter_definitions for update to authenticated
  using (
    (select private.is_staff(array['admin']::public.staff_role[]))
  )
  with check (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );
create policy step2_filter_definitions_admin_delete
  on public.filter_definitions for delete to authenticated
  using (
    (select private.is_staff(array['admin']::public.staff_role[]))
  );

revoke insert, update, delete on public.categories from anon;
revoke insert, update, delete on public.field_definitions from anon;
revoke insert, update, delete on public.filter_definitions from anon;
revoke delete on public.categories from authenticated;
revoke delete on public.field_definitions from authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.field_definitions to authenticated;
grant select, insert, update, delete on public.filter_definitions to authenticated;

alter table public.categories
  add constraint categories_code_format_check
  check (code ~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$');

alter table public.field_definitions
  add constraint field_definitions_allowed_values_array_check
  check (jsonb_typeof(allowed_values) = 'array'),
  add constraint field_definitions_multi_enum_shape_check
  check (data_type <> 'multi_enum' or is_multi_value);

alter table public.filter_definitions
  add column updated_at timestamptz not null default now(),
  add constraint filter_definitions_sort_order_check
  check (sort_order >= 0),
  add constraint filter_definitions_required_visible_check
  check (not is_required_for_publish or is_visible);

create trigger set_filter_definitions_updated_at
before update on public.filter_definitions
for each row execute function private.set_updated_at();

create or replace function private.validate_taxonomy_category()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent_status public.publication_status;
begin
  if new.parent_id = new.id then
    raise exception 'category_self_parent' using errcode = '23514';
  end if;

  if new.parent_id is not null then
    if exists (
      with recursive ancestors as (
        select c.id, c.parent_id
        from public.categories as c
        where c.id = new.parent_id
        union all
        select c.id, c.parent_id
        from public.categories as c
        join ancestors as a on c.id = a.parent_id
      )
      select 1 from ancestors where id = new.id
    ) then
      raise exception 'category_cycle_detected' using errcode = '23514';
    end if;

    select status into v_parent_status
    from public.categories
    where id = new.parent_id;

    if v_parent_status is null then
      raise exception 'category_parent_not_found' using errcode = '23503';
    end if;
    if new.status = 'published' and v_parent_status <> 'published' then
      raise exception 'published_category_requires_published_parent'
        using errcode = '23514';
    end if;
  end if;

  if new.code = 'COF-GREEN' and new.status = 'published' then
    raise exception 'green_coffee_deferred_from_v1' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published'
       and (new.code is distinct from old.code
            or new.slug is distinct from old.slug) then
      raise exception 'published_category_identity_is_immutable'
        using errcode = '23514';
    end if;

    if old.status is distinct from new.status
       and not (
         (old.status = 'draft' and new.status in ('in_review', 'archived'))
         or (old.status = 'in_review' and new.status in ('draft', 'published', 'rejected'))
         or (old.status = 'published' and new.status = 'archived')
         or (old.status = 'rejected' and new.status in ('draft', 'archived'))
         or (old.status = 'archived' and new.status = 'draft')
       ) then
      raise exception 'invalid_category_status_transition:%->%',
        old.status, new.status using errcode = '23514';
    end if;

    if old.status = 'published' and new.status <> 'published'
       and exists (
         select 1 from public.categories as child
         where child.parent_id = new.id
           and child.status = 'published'
       ) then
      raise exception 'published_children_block_parent_unpublish'
        using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

revoke all on function private.validate_taxonomy_category()
  from public, anon, authenticated;

create trigger validate_taxonomy_category
before insert or update of code, slug, parent_id, status
on public.categories
for each row execute function private.validate_taxonomy_category();

comment on function private.validate_taxonomy_category() is
  'STEP2 category DAG, publication lifecycle, immutable identity, and Green Coffee V1 boundary enforcement.';

do $$
declare
  v_dangerous integer;
begin
  select count(*) into v_dangerous
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');

  if v_dangerous <> 0 then
    raise exception 'P0 privilege hardening failed; dangerous grant count=%',
      v_dangerous;
  end if;
end
$$;

commit;
