-- Coffee Platform V1 — Step 1 database hardening
-- Scope: Core/EAV/RLS, Baghdad IQD-only pricing, and Arabic search.
-- No commerce, checkout, payment, order, or Phase 2 Green Coffee objects.

begin;

-- ---------------------------------------------------------------------------
-- 1. RLS helper: statement-stable, protected, and intended to be called from
--    policies as `(select private.is_staff(...))` so PostgreSQL creates an
--    initPlan instead of invoking the helper once per candidate row.
-- ---------------------------------------------------------------------------
create or replace function private.is_staff(
  allowed_roles public.staff_role[]
    default array['editor','verifier','admin']::public.staff_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_staff(public.staff_role[]) from public, anon;
grant usage on schema private to authenticated, service_role;
grant execute on function private.is_staff(public.staff_role[]) to authenticated;

comment on function private.is_staff(public.staff_role[]) is
  'RLS authorization helper. In policies call as (select private.is_staff(...)) to obtain a per-statement initPlan.';

-- Supabase's Performance Advisor reports every pair of permissive policies
-- that can run for the same role/action. Snapshot and consolidate only the
-- affected tables. OR preserves PostgreSQL's permissive-policy semantics;
-- restrictive policies are deliberately untouched.
create temporary table step1_rls_policy_snapshot on commit drop as
with recursive actions(action) as (
  values ('SELECT'::text), ('INSERT'), ('UPDATE'), ('DELETE')
), expanded as (
  select p.schemaname,
         p.tablename,
         p.policyname,
         p.cmd,
         p.qual,
         p.with_check,
         r.role_name,
         a.action
  from pg_catalog.pg_policies as p
  cross join lateral unnest(p.roles) as r(role_name)
  join actions as a on p.cmd = 'ALL' or p.cmd = a.action
  where p.permissive = 'PERMISSIVE'
    and p.schemaname in ('public', 'storage')
), affected_tables as (
  select schemaname, tablename
  from expanded
  where role_name = 'authenticated'
  group by schemaname, tablename, action
  having count(*) > 1
)
select e.*
from expanded as e
join affected_tables as t using (schemaname, tablename);

do $$
declare
  unsupported_public_role text;
  policy_row record;
  rebuilt record;
  policy_name text;
begin
  select string_agg(distinct schemaname || '.' || tablename, ', ')
    into unsupported_public_role
  from step1_rls_policy_snapshot
  where role_name = 'public';

  if unsupported_public_role is not null then
    raise exception
      'Migration 031 will not guess how to split PUBLIC-role policies on: %',
      unsupported_public_role
      using errcode = '0A000';
  end if;

  for policy_row in
    select distinct schemaname, tablename, policyname
    from step1_rls_policy_snapshot
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename
    );
  end loop;

  for rebuilt in
    select schemaname,
           tablename,
           role_name,
           action,
           string_agg(distinct '(' || coalesce(qual, 'true') || ')', ' OR ') as using_expression,
           string_agg(
             distinct '(' || coalesce(with_check, qual, 'true') || ')',
             ' OR '
           ) as check_expression
    from step1_rls_policy_snapshot
    group by schemaname, tablename, role_name, action
    order by schemaname, tablename, role_name, action
  loop
    policy_name := left(
      'step1_' || rebuilt.role_name || '_' || lower(rebuilt.action) || '_' ||
      rebuilt.tablename,
      54
    ) || '_' || substr(
      md5(rebuilt.schemaname || '.' || rebuilt.tablename || ':' ||
          rebuilt.role_name || ':' || rebuilt.action),
      1,
      8
    );

    if rebuilt.action = 'INSERT' then
      execute format(
        'create policy %I on %I.%I for insert to %I with check (%s)',
        policy_name, rebuilt.schemaname, rebuilt.tablename,
        rebuilt.role_name, rebuilt.check_expression
      );
    elsif rebuilt.action = 'UPDATE' then
      execute format(
        'create policy %I on %I.%I for update to %I using (%s) with check (%s)',
        policy_name, rebuilt.schemaname, rebuilt.tablename,
        rebuilt.role_name, rebuilt.using_expression, rebuilt.check_expression
      );
    else
      execute format(
        'create policy %I on %I.%I for %s to %I using (%s)',
        policy_name, rebuilt.schemaname, rebuilt.tablename,
        rebuilt.action, rebuilt.role_name, rebuilt.using_expression
      );
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Controlled roasting-machine heat source vocabulary.
--    Abort rather than silently map an obsolete or ambiguous value.
-- ---------------------------------------------------------------------------
do $$
declare
  invalid_values text;
begin
  select string_agg(distinct heat_source, ', ' order by heat_source)
    into invalid_values
  from public.roaster_specifications
  where heat_source is not null
    and heat_source not in (
      'electric', 'natural_gas', 'lpg', 'dual_fuel', 'other_declared'
    );

  if invalid_values is not null then
    raise exception
      'Unsupported roaster_specifications.heat_source values: %. Review and map them explicitly before applying migration 031.',
      invalid_values
      using errcode = '23514';
  end if;
end
$$;

alter table public.roaster_specifications
  drop constraint if exists roaster_specifications_heat_source_check;

alter table public.roaster_specifications
  add constraint roaster_specifications_heat_source_check
  check (
    heat_source is null
    or heat_source in (
      'electric', 'natural_gas', 'lpg', 'dual_fuel', 'other_declared'
    )
  );

-- Keep the taxonomy field definition synchronized with the physical column.
update public.field_definitions
set allowed_values = '["electric","natural_gas","lpg","dual_fuel","other_declared"]'::jsonb,
    validation_rules = jsonb_set(
      validation_rules,
      '{raw_allowed}',
      '["electric|natural_gas|lpg|dual_fuel|other_declared"]'::jsonb,
      true
    )
where code = 'heat_source';

-- ---------------------------------------------------------------------------
-- 3. EAV faceted-search indexes. Each B-tree starts with the field identifier
--    because every facet query is scoped to a field definition. JSON uses GIN
--    for multi-enum/containment facets. The current schema stores single enums
--    in value_text, hence the explicit enum/text index name.
-- ---------------------------------------------------------------------------
create index if not exists pav_decimal_facet_idx
  on public.product_attribute_values
    (field_definition_id, value_decimal, product_id)
  where value_decimal is not null;

create index if not exists pav_integer_facet_idx
  on public.product_attribute_values
    (field_definition_id, value_integer, product_id)
  where value_integer is not null;

create index if not exists pav_enum_text_facet_idx
  on public.product_attribute_values
    (field_definition_id, value_text, product_id)
  where value_text is not null;

create index if not exists pav_boolean_facet_idx
  on public.product_attribute_values
    (field_definition_id, value_boolean, product_id)
  where value_boolean is not null;

create index if not exists pav_date_facet_idx
  on public.product_attribute_values
    (field_definition_id, value_date, product_id)
  where value_date is not null;

create index if not exists pav_json_facet_gin_idx
  on public.product_attribute_values
  using gin (value_json jsonb_path_ops)
  where value_json is not null;

-- ---------------------------------------------------------------------------
-- 4. Baghdad V1 offers are IQD-only. USD and FX are deliberately deferred.
--    Abort on non-IQD data; never convert or delete a price silently.
-- ---------------------------------------------------------------------------
alter table public.markets
  drop constraint if exists markets_baghdad_iqd_check;
alter table public.markets
  add constraint markets_baghdad_iqd_check
  check (code <> 'IQ-BGD' or currency_code = 'IQD');

do $$
declare
  unsupported text;
begin
  select string_agg(distinct btrim(currency_code), ', ' order by btrim(currency_code))
    into unsupported
  from public.offers
  where btrim(currency_code) <> 'IQD';

  if unsupported is not null then
    raise exception
      'Unsupported offers.currency_code values: %. Baghdad V1 accepts IQD only; convert nothing automatically.',
      unsupported
      using errcode = '23514';
  end if;
end
$$;

-- Remove columns/constraints from the superseded local FX draft, if present.
drop index if exists public.offers_fx_source_record_id_idx;
alter table public.offers
  drop constraint if exists offers_fx_evidence_check,
  drop constraint if exists offers_currency_v1_check,
  drop constraint if exists offers_published_price_check;
alter table public.offers
  drop column if exists reference_price_iqd,
  drop column if exists fx_source_record_id,
  drop column if exists fx_observed_at,
  drop column if exists fx_rate_iqd_per_unit;

alter table public.offers
  alter column currency_code set default 'IQD';

alter table public.offers
  add constraint offers_currency_v1_check
    check (currency_code = 'IQD'),
  add constraint offers_published_price_check
    check (status <> 'published' or price is not null);

alter table public.offers
  add column reference_price_iqd numeric(20,3)
  generated always as (
    price
  ) stored;

create index if not exists offers_market_reference_price_idx
  on public.offers (market_id, reference_price_iqd, product_id)
  where status = 'published'
    and price is not null;

create index if not exists offers_product_reference_price_idx
  on public.offers (product_id, reference_price_iqd)
  where status = 'published'
    and price is not null;

comment on column public.offers.reference_price_iqd is
  'Stored Baghdad V1 sort/filter price in IQD. USD and FX conversion are deferred.';

-- ---------------------------------------------------------------------------
-- 5. Arabic/English search normalization. PostgreSQL has no built-in Arabic
--    stemmer, so the simple dictionary is used deliberately. Normalization
--    removes common Arabic diacritics/tatweel and folds common letter variants.
-- ---------------------------------------------------------------------------
create or replace function private.normalize_search_text(input_text text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(
    pg_catalog.regexp_replace(
      pg_catalog.translate(
        pg_catalog.lower(input_text),
        'أإآٱىؤئةـًٌٍَُِّْٰ',
        'اااايويه'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$$;

revoke all on function private.normalize_search_text(text) from public, anon;
grant execute on function private.normalize_search_text(text) to authenticated, service_role;

drop index if exists public.products_search_idx;
alter table public.products drop column if exists search_document;
alter table public.products
  add column search_text_normalized text
  generated always as (
    private.normalize_search_text(
      coalesce(name_ar, '') || ' ' ||
      coalesce(name_en, '') || ' ' ||
      coalesce(model_number, '') || ' ' ||
      coalesce(summary_ar, '') || ' ' ||
      coalesce(summary_en, '')
    )
  ) stored,
  add column search_document tsvector
  generated always as (
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(name_ar, ''))), 'A') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(name_en, ''))), 'A') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(model_number, ''))), 'A') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(summary_ar, ''))), 'B') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(summary_en, ''))), 'B')
  ) stored;

create index products_search_idx
  on public.products using gin (search_document);
create index products_search_text_trgm_idx
  on public.products using gin
    (search_text_normalized extensions.gin_trgm_ops);

drop index if exists public.contents_search_idx;
alter table public.contents drop column if exists search_document;
alter table public.contents
  add column search_text_normalized text
  generated always as (
    private.normalize_search_text(
      coalesce(title_ar, '') || ' ' ||
      coalesce(title_en, '') || ' ' ||
      coalesce(excerpt_ar, '') || ' ' ||
      coalesce(excerpt_en, '')
    )
  ) stored,
  add column search_document tsvector
  generated always as (
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(title_ar, ''))), 'A') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(title_en, ''))), 'A') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(excerpt_ar, ''))), 'B') ||
    setweight(to_tsvector('simple', private.normalize_search_text(coalesce(excerpt_en, ''))), 'B')
  ) stored;

create index contents_search_idx
  on public.contents using gin (search_document);
create index contents_search_text_trgm_idx
  on public.contents using gin
    (search_text_normalized extensions.gin_trgm_ops);

comment on column public.products.search_text_normalized is
  'Normalized Arabic/English text for pg_trgm typo and substring matching.';
comment on column public.products.search_document is
  'Weighted simple-dictionary tsvector; Arabic and exact model tokens are preserved without invented stemming.';

commit;

