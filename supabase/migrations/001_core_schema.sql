-- Coffee Platform V1 — Supabase core schema
-- Version: 1.0.0 | Date: 2026-08-09
-- Scope: Baghdad-first discovery platform. No cart, payment, internal order, or delivery tables.
-- Green coffee is deliberately deferred. Roasting machines are included in V1.
-- Run once on a new Supabase project through SQL Editor. The transaction rolls back on error.

begin;

create extension if not exists pg_trgm;
create schema if not exists private;

create type public.publication_status as enum
  ('draft', 'in_review', 'published', 'archived', 'rejected');
create type public.staff_role as enum
  ('member', 'editor', 'verifier', 'admin');
create type public.verification_tier as enum
  ('t1_unverified', 't2_source_checked', 't3_owner_verified');
create type public.availability_status as enum
  ('in_stock', 'out_of_stock', 'preorder', 'unknown');
create type public.organization_role_type as enum
  ('roaster', 'cafe', 'seller', 'equipment_supplier', 'manufacturer', 'importer', 'service_provider');
create type public.attribute_data_type as enum
  ('text', 'integer', 'decimal', 'boolean', 'date', 'enum', 'multi_enum', 'reference', 'json');
create type public.rights_request_type as enum
  ('correction', 'removal', 'objection', 'privacy', 'listing_claim');
create type public.case_status as enum
  ('submitted', 'needs_evidence', 'in_review', 'approved', 'rejected', 'closed');
create type public.content_type as enum
  ('article', 'guide', 'lesson', 'glossary');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'ar-IQ' check (locale in ('ar-IQ', 'ar', 'en')),
  role public.staff_role not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
revoke all on function private.set_updated_at() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_staff(allowed_roles public.staff_role[] default array['editor','verifier','admin']::public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.is_active
      and p.role = any(allowed_roles)
  );
$$;

revoke all on function private.is_staff(public.staff_role[]) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_staff(public.staff_role[]) to authenticated;

create table public.markets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{2,20}$'),
  name_ar text not null,
  name_en text not null,
  country_code char(2) not null,
  city_name_ar text,
  city_name_en text,
  currency_code char(3) not null,
  timezone text not null,
  is_primary boolean not null default false,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  website_url text,
  phone text,
  email text,
  logo_url text,
  verification_tier public.verification_tier not null default 't1_unverified',
  status public.publication_status not null default 'draft',
  source_checked_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_roles (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_type public.organization_role_type not null,
  is_primary boolean not null default false,
  active_from date,
  active_to date,
  created_at timestamptz not null default now(),
  primary key (organization_id, role_type),
  check (active_to is null or active_from is null or active_to >= active_from)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete restrict,
  name_ar text,
  name_en text,
  address_ar text not null,
  address_en text,
  district_ar text,
  district_en text,
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  opening_hours jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text,
  manufacturer_organization_id uuid references public.organizations(id) on delete set null,
  website_url text,
  logo_url text,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  parent_id uuid references public.categories(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  sort_order integer not null default 0,
  comparison_group text,
  phase text not null default 'V1',
  is_filterable boolean not null default true,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);

create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_type text not null check (source_type in ('manufacturer', 'official_registry', 'organization', 'seller', 'government', 'professional_body', 'research', 'editorial', 'other')),
  url text,
  publisher text,
  published_on date,
  accessed_at timestamptz not null default now(),
  license_note text,
  evidence_excerpt text,
  checksum text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar text not null,
  name_en text,
  summary_ar text,
  summary_en text,
  description_ar text,
  description_en text,
  product_kind text not null check (product_kind in ('roasted_coffee', 'equipment', 'consumable', 'care_product', 'replacement_part')),
  brand_id uuid references public.brands(id) on delete set null,
  owner_organization_id uuid references public.organizations(id) on delete set null,
  model_number text,
  verification_tier public.verification_tier not null default 't1_unverified',
  status public.publication_status not null default 'draft',
  source_checked_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(name_ar,'') || ' ' || coalesce(name_en,'') || ' ' || coalesce(model_number,'') || ' ' || coalesce(summary_ar,'') || ' ' || coalesce(summary_en,''))
  ) stored
);

create unique index products_brand_model_unique
  on public.products (brand_id, lower(model_number))
  where brand_id is not null and model_number is not null and status <> 'archived';

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create unique index one_primary_category_per_product
  on public.product_categories(product_id) where is_primary;

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'document')),
  url text not null,
  alt_ar text,
  alt_en text,
  rights_note text,
  source_record_id uuid references public.source_records(id) on delete set null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index one_primary_media_per_product
  on public.product_media(product_id) where is_primary;

create table public.package_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  label_ar text not null,
  label_en text,
  net_weight_g numeric(10,2) check (net_weight_g > 0),
  volume_ml numeric(10,2) check (volume_ml > 0),
  is_default boolean not null default false,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sku)
);

create unique index one_default_package_per_product
  on public.package_options(product_id) where is_default and status <> 'archived';

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  package_option_id uuid references public.package_options(id) on delete cascade,
  seller_organization_id uuid not null references public.organizations(id) on delete restrict,
  market_id uuid not null references public.markets(id) on delete restrict,
  price numeric(14,3) check (price >= 0),
  currency_code char(3) not null,
  availability public.availability_status not null default 'unknown',
  external_url text not null,
  observed_at timestamptz not null,
  expires_at timestamptz,
  source_record_id uuid references public.source_records(id) on delete set null,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > observed_at)
);

create table public.field_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  name_ar text not null,
  name_en text not null,
  data_type public.attribute_data_type not null,
  unit_code text,
  allowed_values jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  missing_value_policy text not null default 'hide' check (missing_value_policy in ('block_publish', 'lower_confidence', 'show_unknown', 'hide')),
  is_searchable boolean not null default false,
  is_comparable boolean not null default false,
  is_recommendation_input boolean not null default false,
  is_multi_value boolean not null default false,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.filter_definitions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  field_definition_id uuid not null references public.field_definitions(id) on delete cascade,
  operator text not null check (operator in ('equals', 'in', 'range', 'contains', 'exists')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_required_for_publish boolean not null default false,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (category_id, field_definition_id)
);

create table public.product_attribute_values (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  field_definition_id uuid not null references public.field_definitions(id) on delete restrict,
  value_text text,
  value_integer bigint,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_json jsonb,
  unit_code text,
  source_record_id uuid references public.source_records(id) on delete set null,
  observed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, field_definition_id),
  check (num_nonnulls(value_text, value_integer, value_decimal, value_boolean, value_date, value_json) = 1)
);

create table public.roaster_specifications (
  product_id uuid primary key references public.products(id) on delete cascade,
  application text[] not null default '{}',
  heat_source text check (heat_source in ('electric', 'gas', 'hybrid', 'other')),
  batch_min_kg numeric(10,3) check (batch_min_kg > 0),
  batch_max_kg numeric(10,3) check (batch_max_kg > 0),
  production_kg_per_hour numeric(10,3) check (production_kg_per_hour > 0),
  control_level text check (control_level in ('manual', 'assisted', 'profile_control', 'automated')),
  power_supply text,
  gas_type text,
  exhaust_requirements text,
  dimensions_mm jsonb not null default '{}'::jsonb,
  weight_kg numeric(10,2) check (weight_kg > 0),
  warranty_months integer check (warranty_months >= 0),
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  source_checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (batch_max_kg is null or batch_min_kg is null or batch_max_kg >= batch_min_kg)
);

create table public.product_compatibilities (
  source_product_id uuid not null references public.products(id) on delete cascade,
  target_product_id uuid not null references public.products(id) on delete cascade,
  compatibility_type text not null check (compatibility_type in ('compatible', 'required_accessory', 'replacement_part', 'consumable', 'not_compatible')),
  note_ar text,
  note_en text,
  source_record_id uuid references public.source_records(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (source_product_id, target_product_id, compatibility_type),
  check (source_product_id <> target_product_id)
);

create table public.countries (
  code char(2) primary key,
  name_ar text not null,
  name_en text not null,
  status public.publication_status not null default 'draft'
);

create table public.coffee_regions (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code) on delete restrict,
  slug text not null,
  name_ar text not null,
  name_en text,
  altitude_min_m integer,
  altitude_max_m integer,
  status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (country_code, slug),
  check (altitude_max_m is null or altitude_min_m is null or altitude_max_m >= altitude_min_m)
);

create table public.origin_claims (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  country_code char(2) references public.countries(code) on delete restrict,
  coffee_region_id uuid references public.coffee_regions(id) on delete restrict,
  farm_or_producer_name text,
  lot_reference text,
  process_code text,
  variety_codes text[] not null default '{}',
  harvest_label text,
  source_record_id uuid not null references public.source_records(id) on delete restrict,
  verification_tier public.verification_tier not null default 't1_unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (country_code is not null or coffee_region_id is not null or farm_or_producer_name is not null or lot_reference is not null)
);

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  type public.content_type not null,
  title_ar text not null,
  title_en text,
  excerpt_ar text,
  excerpt_en text,
  body_ar text,
  body_en text,
  hero_image_url text,
  author_profile_id uuid references public.profiles(id) on delete set null,
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(title_ar,'') || ' ' || coalesce(title_en,'') || ' ' || coalesce(excerpt_ar,'') || ' ' || coalesce(excerpt_en,''))
  ) stored
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  status public.publication_status not null default 'draft'
);

create table public.content_topics (
  content_id uuid not null references public.contents(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (content_id, topic_id)
);

create table public.content_links (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  country_code char(2) references public.countries(code) on delete cascade,
  coffee_region_id uuid references public.coffee_regions(id) on delete cascade,
  relation_type text not null default 'related',
  created_at timestamptz not null default now(),
  check (num_nonnulls(product_id, organization_id, category_id, country_code, coffee_region_id) = 1)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.comparison_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'مقارنة',
  comparison_group text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comparison_items (
  comparison_list_id uuid not null references public.comparison_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position smallint not null check (position between 1 and 4),
  created_at timestamptz not null default now(),
  primary key (comparison_list_id, product_id),
  unique (comparison_list_id, position)
);

create table public.rights_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default ('RR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  request_type public.rights_request_type not null,
  status public.case_status not null default 'submitted',
  submitted_by uuid references public.profiles(id) on delete set null,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  organization_id uuid references public.organizations(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  details text not null,
  consent_to_contact boolean not null default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check (organization_id is not null or product_id is not null or request_type = 'privacy')
);

create table public.listing_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  claimant_user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_role text not null,
  official_contact_channel text not null,
  requested_tier public.verification_tier not null default 't2_source_checked',
  status public.case_status not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_open_listing_claim_per_user_org
  on public.listing_claims(organization_id, claimant_user_id)
  where status in ('submitted', 'needs_evidence', 'in_review', 'approved');

create table public.verification_evidence (
  id uuid primary key default gen_random_uuid(),
  rights_request_id uuid references public.rights_requests(id) on delete cascade,
  listing_claim_id uuid references public.listing_claims(id) on delete cascade,
  evidence_type text not null,
  storage_path text,
  external_reference text,
  notes text,
  contains_personal_data boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  retention_until date,
  created_at timestamptz not null default now(),
  check (num_nonnulls(rights_request_id, listing_claim_id) = 1)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  source text not null default 'database',
  created_at timestamptz not null default now()
);

-- Performance and policy indexes.
create index organizations_status_idx on public.organizations(status);
create index organizations_name_ar_trgm_idx on public.organizations using gin (name_ar gin_trgm_ops);
create index locations_org_market_idx on public.locations(organization_id, market_id);
create index categories_parent_sort_idx on public.categories(parent_id, sort_order);
create index products_status_kind_idx on public.products(status, product_kind);
create index products_brand_idx on public.products(brand_id);
create index products_search_idx on public.products using gin(search_document);
create index products_name_ar_trgm_idx on public.products using gin(name_ar gin_trgm_ops);
create index product_categories_category_idx on public.product_categories(category_id, product_id);
create index offers_product_market_idx on public.offers(product_id, market_id, status);
create index offers_seller_idx on public.offers(seller_organization_id);
create index product_attribute_lookup_idx on public.product_attribute_values(field_definition_id, product_id);
create index origin_claims_product_idx on public.origin_claims(product_id);
create index contents_status_type_idx on public.contents(status, type);
create index contents_search_idx on public.contents using gin(search_document);
create index favorites_user_idx on public.favorites(user_id);
create index comparison_lists_user_idx on public.comparison_lists(user_id);
create index rights_requests_user_idx on public.rights_requests(submitted_by);
create index listing_claims_user_idx on public.listing_claims(claimant_user_id);

-- Automatic updated_at timestamps.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','markets','organizations','locations','brands','categories','products',
    'package_options','offers','field_definitions','product_attribute_values',
    'roaster_specifications','coffee_regions','origin_claims','contents',
    'comparison_lists','rights_requests','listing_claims'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function private.set_updated_at()',
      'set_' || table_name || '_updated_at', table_name
    );
  end loop;
end $$;

-- Seed the launch market only. Catalog and taxonomy seeds are a separate reviewed migration.
insert into public.markets
  (code, name_ar, name_en, country_code, city_name_ar, city_name_en, currency_code, timezone, is_primary, status)
values
  ('IQ-BGD', 'بغداد، العراق', 'Baghdad, Iraq', 'IQ', 'بغداد', 'Baghdad', 'IQD', 'Asia/Baghdad', true, 'published');

-- Row Level Security: public reads only published catalog records; editorial writes stay staff-only.
alter table public.profiles enable row level security;
alter table public.markets enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_roles enable row level security;
alter table public.locations enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.source_records enable row level security;
alter table public.products enable row level security;
alter table public.product_categories enable row level security;
alter table public.product_media enable row level security;
alter table public.package_options enable row level security;
alter table public.offers enable row level security;
alter table public.field_definitions enable row level security;
alter table public.filter_definitions enable row level security;
alter table public.product_attribute_values enable row level security;
alter table public.roaster_specifications enable row level security;
alter table public.product_compatibilities enable row level security;
alter table public.countries enable row level security;
alter table public.coffee_regions enable row level security;
alter table public.origin_claims enable row level security;
alter table public.contents enable row level security;
alter table public.topics enable row level security;
alter table public.content_topics enable row level security;
alter table public.content_links enable row level security;
alter table public.favorites enable row level security;
alter table public.comparison_lists enable row level security;
alter table public.comparison_items enable row level security;
alter table public.rights_requests enable row level security;
alter table public.listing_claims enable row level security;
alter table public.verification_evidence enable row level security;
alter table public.audit_events enable row level security;

-- Explicit API privileges. RLS below remains the final authorization boundary.
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant insert on public.rights_requests to anon;
grant usage, select on all sequences in schema public to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, locale) on public.profiles to authenticated;

create policy markets_public_read on public.markets for select to anon, authenticated using (status = 'published');
create policy organizations_public_read on public.organizations for select to anon, authenticated using (status = 'published');
create policy organization_roles_public_read on public.organization_roles for select to anon, authenticated
  using (exists (select 1 from public.organizations o where o.id = organization_id and o.status = 'published'));
create policy locations_public_read on public.locations for select to anon, authenticated using (status = 'published');
create policy brands_public_read on public.brands for select to anon, authenticated using (status = 'published');
create policy categories_public_read on public.categories for select to anon, authenticated using (status = 'published');
create policy products_public_read on public.products for select to anon, authenticated using (status = 'published');
create policy product_categories_public_read on public.product_categories for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy product_media_public_read on public.product_media for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy package_options_public_read on public.package_options for select to anon, authenticated using (status = 'published');
create policy offers_public_read on public.offers for select to anon, authenticated using (status = 'published');
create policy field_definitions_public_read on public.field_definitions for select to anon, authenticated using (status = 'published');
create policy filter_definitions_public_read on public.filter_definitions for select to anon, authenticated using (status = 'published');
create policy product_attribute_values_public_read on public.product_attribute_values for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy roaster_specs_public_read on public.roaster_specifications for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy compatibilities_public_read on public.product_compatibilities for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = source_product_id and p.status = 'published'));
create policy countries_public_read on public.countries for select to anon, authenticated using (status = 'published');
create policy coffee_regions_public_read on public.coffee_regions for select to anon, authenticated using (status = 'published');
create policy origin_claims_public_read on public.origin_claims for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy contents_public_read on public.contents for select to anon, authenticated using (status = 'published');
create policy topics_public_read on public.topics for select to anon, authenticated using (status = 'published');
create policy content_topics_public_read on public.content_topics for select to anon, authenticated
  using (exists (select 1 from public.contents c where c.id = content_id and c.status = 'published'));
create policy content_links_public_read on public.content_links for select to anon, authenticated
  using (exists (select 1 from public.contents c where c.id = content_id and c.status = 'published'));

create policy favorites_owner_all on public.favorites for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy comparison_lists_owner_all on public.comparison_lists for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy comparison_items_owner_all on public.comparison_items for all to authenticated
  using (exists (select 1 from public.comparison_lists l where l.id = comparison_list_id and l.user_id = (select auth.uid())))
  with check (exists (select 1 from public.comparison_lists l where l.id = comparison_list_id and l.user_id = (select auth.uid())));

create policy rights_requests_anon_insert on public.rights_requests for insert to anon
  with check (submitted_by is null);
create policy rights_requests_user_insert on public.rights_requests for insert to authenticated
  with check (submitted_by = (select auth.uid()));
create policy rights_requests_owner_read on public.rights_requests for select to authenticated
  using (submitted_by = (select auth.uid()) or (select private.is_staff()));
create policy listing_claims_owner_insert on public.listing_claims for insert to authenticated
  with check (claimant_user_id = (select auth.uid()));
create policy listing_claims_owner_read on public.listing_claims for select to authenticated
  using (claimant_user_id = (select auth.uid()) or (select private.is_staff()));
create policy verification_evidence_staff_only on public.verification_evidence for all to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Staff CRUD policies for curated data. No public contribution policy is created.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'markets','organizations','organization_roles','locations','brands','categories','source_records',
    'products','product_categories','product_media','package_options','offers','field_definitions',
    'filter_definitions','product_attribute_values','roaster_specifications','product_compatibilities',
    'countries','coffee_regions','origin_claims','contents','topics','content_topics','content_links',
    'rights_requests','listing_claims','audit_events'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))',
      table_name || '_staff_all', table_name
    );
  end loop;
end $$;

comment on table public.products is 'Curated V1 product catalog; green coffee is not a product_kind in this release.';
comment on table public.offers is 'External seller referrals only; not an internal cart or order system.';
comment on table public.roaster_specifications is 'Structured V1 roasting-machine specifications backed by manufacturer sources.';
comment on table public.rights_requests is 'Correction, removal, objection, privacy, and listing-claim intake with auditable lifecycle.';

commit;
