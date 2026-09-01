-- Coffee Platform V1 — storage, launch controls, and Baghdad data operations
-- Version: 1.0.0 | Date: 2026-08-09
-- Requires migrations 001 and 002. Safe to rerun.

begin;

do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.markets') is null
     or to_regclass('public.categories') is null then
    raise exception 'Migrations 001 and 002 must be completed before 003';
  end if;
end $$;

-- Owner-approved launch decisions are stored as explicit configuration.
create table if not exists public.platform_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  value jsonb not null,
  description_ar text not null,
  description_en text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_platform_settings_updated_at on public.platform_settings;
create trigger set_platform_settings_updated_at
before update on public.platform_settings
for each row execute function private.set_updated_at();

insert into public.platform_settings (key, value, description_ar, description_en, is_public)
values
  ('launch_market_code', '"IQ-BGD"'::jsonb, 'رمز سوق الإطلاق: بغداد، العراق', 'Launch market: Baghdad, Iraq', true),
  ('public_launch_enabled', 'false'::jsonb, 'يبقى النشر العام معطلاً حتى موافقة المالك', 'Public launch remains disabled until owner approval', true),
  ('green_coffee_enabled', 'false'::jsonb, 'البن الأخضر مؤجل في V1', 'Green coffee is deferred in V1', true),
  ('roasting_machines_enabled', 'true'::jsonb, 'مكائن التحميص مشمولة في V1', 'Roasting machines are included in V1', true),
  ('commerce_mode', '"external_referral"'::jsonb, 'اكتشاف وإحالة خارجية بلا سلة أو دفع داخلي', 'Discovery and external referral; no internal cart or payment', true),
  ('directory_mode', '"curated_verified"'::jsonb, 'الدليل منسق ومراجع ولا يقبل النشر التلقائي', 'Curated and verified directory without automatic publishing', true),
  ('default_locale', '"ar-IQ"'::jsonb, 'اللغة الافتراضية للعراق', 'Default Iraq locale', true),
  ('enabled_locales', '["ar-IQ","en"]'::jsonb, 'اللغات المفعلة في V1', 'Enabled V1 locales', true),
  ('max_compare_items', '4'::jsonb, 'الحد الأعلى لعناصر المقارنة', 'Maximum comparison items', true)
on conflict (key) do update set
  value = excluded.value,
  description_ar = excluded.description_ar,
  description_en = excluded.description_en,
  is_public = excluded.is_public;

-- Controlled ingestion pipeline for researched Baghdad catalog data.
create table if not exists public.data_import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique check (batch_code ~ '^[A-Z0-9_-]{3,50}$'),
  entity_type text not null check (entity_type in ('organization', 'product', 'offer', 'content', 'location')),
  market_id uuid not null references public.markets(id) on delete restrict,
  source_label text not null,
  source_record_id uuid references public.source_records(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'validating', 'ready', 'imported', 'rejected', 'archived')),
  total_rows integer not null default 0 check (total_rows >= 0),
  valid_rows integer not null default 0 check (valid_rows >= 0),
  rejected_rows integer not null default 0 check (rejected_rows >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_rows + rejected_rows <= total_rows)
);

create table if not exists public.data_intake_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.data_import_batches(id) on delete cascade,
  source_row_number integer not null check (source_row_number > 0),
  dedupe_key text,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  validation_status text not null default 'pending' check (validation_status in ('pending', 'valid', 'warning', 'invalid', 'imported')),
  validation_messages jsonb not null default '[]'::jsonb,
  target_table text,
  target_id uuid,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, source_row_number)
);

create table if not exists public.data_quality_issues (
  id uuid primary key default gen_random_uuid(),
  intake_row_id uuid references public.data_intake_rows(id) on delete cascade,
  entity_table text,
  entity_id uuid,
  issue_code text not null,
  severity text not null check (severity in ('blocker', 'high', 'medium', 'low')),
  field_code text,
  message_ar text not null,
  message_en text,
  status text not null default 'open' check (status in ('open', 'accepted', 'fixed', 'dismissed')),
  resolution_note text,
  assigned_to uuid references public.profiles(id) on delete set null,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (intake_row_id is not null or (entity_table is not null and entity_id is not null))
);

drop trigger if exists set_data_import_batches_updated_at on public.data_import_batches;
create trigger set_data_import_batches_updated_at
before update on public.data_import_batches
for each row execute function private.set_updated_at();

drop trigger if exists set_data_intake_rows_updated_at on public.data_intake_rows;
create trigger set_data_intake_rows_updated_at
before update on public.data_intake_rows
for each row execute function private.set_updated_at();

drop trigger if exists set_data_quality_issues_updated_at on public.data_quality_issues;
create trigger set_data_quality_issues_updated_at
before update on public.data_quality_issues
for each row execute function private.set_updated_at();

create index if not exists data_import_batches_market_status_idx
  on public.data_import_batches(market_id, status);
create index if not exists data_intake_rows_batch_status_idx
  on public.data_intake_rows(batch_id, validation_status);
create unique index if not exists data_intake_rows_batch_dedupe_idx
  on public.data_intake_rows(batch_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists data_quality_issues_status_severity_idx
  on public.data_quality_issues(status, severity);

alter table public.platform_settings enable row level security;
alter table public.data_import_batches enable row level security;
alter table public.data_intake_rows enable row level security;
alter table public.data_quality_issues enable row level security;

grant select on public.platform_settings to anon, authenticated;
grant insert, update, delete on public.platform_settings to authenticated;
grant select, insert, update, delete on public.data_import_batches to authenticated;
grant select, insert, update, delete on public.data_intake_rows to authenticated;
grant select, insert, update, delete on public.data_quality_issues to authenticated;

drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read
on public.platform_settings for select to anon, authenticated
using (is_public);

drop policy if exists platform_settings_staff_all on public.platform_settings;
create policy platform_settings_staff_all
on public.platform_settings for all to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

drop policy if exists data_import_batches_staff_all on public.data_import_batches;
create policy data_import_batches_staff_all
on public.data_import_batches for all to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

drop policy if exists data_intake_rows_staff_all on public.data_intake_rows;
create policy data_intake_rows_staff_all
on public.data_intake_rows for all to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

drop policy if exists data_quality_issues_staff_all on public.data_quality_issues;
create policy data_quality_issues_staff_all
on public.data_quality_issues for all to authenticated
using ((select private.is_staff()))
with check ((select private.is_staff()));

-- Public catalog media: optimized images only, maximum 8 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media',
  'public-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/avif']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Private evidence: identity/claim evidence must never be publicly addressable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-evidence',
  'verification-evidence',
  false,
  10485760,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Staff can manage public catalog media. Public delivery uses the bucket's public flag.
drop policy if exists public_media_staff_select on storage.objects;
create policy public_media_staff_select
on storage.objects for select to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()));

drop policy if exists public_media_staff_insert on storage.objects;
create policy public_media_staff_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'public-media' and (select private.is_staff()));

drop policy if exists public_media_staff_update on storage.objects;
create policy public_media_staff_update
on storage.objects for update to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()))
with check (bucket_id = 'public-media' and (select private.is_staff()));

drop policy if exists public_media_staff_delete on storage.objects;
create policy public_media_staff_delete
on storage.objects for delete to authenticated
using (bucket_id = 'public-media' and (select private.is_staff()));

-- A signed-in claimant may upload evidence only beneath their own UUID folder.
drop policy if exists evidence_owner_insert on storage.objects;
create policy evidence_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'verification-evidence'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists evidence_staff_insert on storage.objects;
create policy evidence_staff_insert
on storage.objects for insert to authenticated
with check (bucket_id = 'verification-evidence' and (select private.is_staff()));

drop policy if exists evidence_owner_select on storage.objects;
create policy evidence_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'verification-evidence'
  and (
    owner_id = (select auth.uid()::text)
    or (select private.is_staff())
  )
);

drop policy if exists evidence_owner_delete on storage.objects;
create policy evidence_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'verification-evidence'
  and owner_id = (select auth.uid()::text)
);

drop policy if exists evidence_staff_update on storage.objects;
create policy evidence_staff_update
on storage.objects for update to authenticated
using (bucket_id = 'verification-evidence' and (select private.is_staff()))
with check (bucket_id = 'verification-evidence' and (select private.is_staff()));

drop policy if exists evidence_staff_delete on storage.objects;
create policy evidence_staff_delete
on storage.objects for delete to authenticated
using (bucket_id = 'verification-evidence' and (select private.is_staff()));

comment on table public.data_import_batches is 'Auditable batches for researched Baghdad launch data; no row publishes automatically.';
comment on table public.data_intake_rows is 'Raw and normalized staging records; import requires staff review.';
comment on table public.data_quality_issues is 'Blocking and non-blocking data quality findings linked to intake or canonical entities.';

commit;

select
  (select count(*) from storage.buckets where id in ('public-media','verification-evidence')) as storage_buckets,
  (select count(*) from public.platform_settings) as platform_settings,
  case when (select value from public.platform_settings where key='launch_market_code') = '"IQ-BGD"'::jsonb then 'IQ-BGD' else 'CHECK' end as launch_market,
  case when (select value from public.platform_settings where key='public_launch_enabled') = 'false'::jsonb then 'OFF' else 'CHECK' end as public_launch;
