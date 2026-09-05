-- Coffee Platform V1 — Wave A Phase 1 canonical governance kernel.
-- Additive only: no legacy lifecycle/status column is renamed or removed.
-- Establishes the canonical lifecycle registry, object-type registry,
-- legacy-to-canonical mappings, and a read-only governed object envelope.

begin;

create table if not exists public.canonical_lifecycle_registry (
  phase text primary key,
  sort_order integer not null unique,
  is_terminal boolean not null default false,
  allowed_next text[] not null default '{}',
  description text not null,
  baseline_version text not null default 'EA-BASELINE-001.v1.0',
  created_at timestamptz not null default now(),
  constraint canonical_lifecycle_phase_format check (phase ~ '^[A-Z_]+$')
);

alter table public.canonical_lifecycle_registry enable row level security;
revoke all on public.canonical_lifecycle_registry from public, anon;
grant select on public.canonical_lifecycle_registry to authenticated;
drop policy if exists canonical_lifecycle_authenticated_select on public.canonical_lifecycle_registry;
create policy canonical_lifecycle_authenticated_select
  on public.canonical_lifecycle_registry for select to authenticated
  using (true);

insert into public.canonical_lifecycle_registry
  (phase, sort_order, is_terminal, allowed_next, description)
values
  ('INGESTED', 10, false, array['VALIDATING','REVIEW','ACTIVE'], 'Object accepted into platform custody; validation may be incomplete.'),
  ('VALIDATING', 20, false, array['REVIEW','ACTIVE','QUARANTINE'], 'Technical, schema, quality or evidence validation is in progress.'),
  ('REVIEW', 30, false, array['ACTIVE','PUBLISHED','QUARANTINE','RETAINED'], 'Governed human or business decision is pending or required.'),
  ('ACTIVE', 40, false, array['PUBLISHED','RETAINED','QUARANTINE','LEGAL_HOLD'], 'Approved for controlled operational use.'),
  ('PUBLISHED', 50, false, array['RETAINED','QUARANTINE','LEGAL_HOLD'], 'Authorized for designated external/public dissemination.'),
  ('RETAINED', 60, false, array['ACTIVE','LEGAL_HOLD','DISPOSITION_REVIEW'], 'Inactive or archival retention period is being honored.'),
  ('QUARANTINE', 70, false, array['REVIEW','RETAINED','LEGAL_HOLD','DISPOSITION_REVIEW'], 'Restricted due to rejection, investigation, risk or controlled retention.'),
  ('LEGAL_HOLD', 80, false, array['ACTIVE','PUBLISHED','RETAINED','QUARANTINE'], 'Disposition and destructive transitions are suspended by legal/governance hold.'),
  ('DISPOSITION_REVIEW', 90, false, array['RETAINED','QUARANTINE','DISPOSED'], 'Object is eligible or queued for governed disposition decision/execution.'),
  ('DISPOSED', 100, true, '{}'::text[], 'Disposition completed; durable disposition evidence remains authoritative.')
on conflict (phase) do update set
  sort_order=excluded.sort_order,
  is_terminal=excluded.is_terminal,
  allowed_next=excluded.allowed_next,
  description=excluded.description,
  baseline_version=excluded.baseline_version;

create table if not exists public.governed_object_type_registry (
  object_type text primary key,
  domain text not null,
  source_schema text not null default 'public',
  source_relation text not null,
  id_column text not null default 'id',
  lifecycle_source text not null,
  provenance_required boolean not null default true,
  retention_applicable boolean not null default false,
  envelope_supported boolean not null default true,
  baseline_version text not null default 'EA-BASELINE-001.v1.0',
  notes text,
  created_at timestamptz not null default now(),
  constraint governed_object_type_format check (object_type ~ '^[a-z0-9_]+$'),
  constraint governed_object_domain_check check (domain in ('DAM','RECORD','ENTITY','INTAKE','WORKFLOW')),
  constraint governed_object_source_unique unique(source_schema, source_relation)
);

alter table public.governed_object_type_registry enable row level security;
revoke all on public.governed_object_type_registry from public, anon;
grant select on public.governed_object_type_registry to authenticated;
drop policy if exists governed_object_types_authenticated_select on public.governed_object_type_registry;
create policy governed_object_types_authenticated_select
  on public.governed_object_type_registry for select to authenticated
  using (true);

insert into public.governed_object_type_registry
  (object_type,domain,source_relation,lifecycle_source,provenance_required,retention_applicable,envelope_supported,notes)
values
  ('media_asset','DAM','media_assets','public.media_asset_lifecycle.lifecycle_state',true,true,true,'Derived lifecycle remains authoritative; canonical phase is a projection.'),
  ('source_record','RECORD','source_records','implicit:capture',true,true,true,'Legacy source records have no explicit lifecycle column; captured records project to INGESTED until Phase 4 adds retention/disposition controls.'),
  ('data_import_batch','INTAKE','data_import_batches','public.data_import_batches.status',true,true,true,'Batch intake workflow.'),
  ('data_intake_row','INTAKE','data_intake_rows','public.data_intake_rows.validation_status',true,false,true,'Row-level validation workflow.'),
  ('product','ENTITY','products','public.products.status',true,true,true,'Catalog master/entity record.'),
  ('organization','ENTITY','organizations','public.organizations.status',true,true,true,'Catalog master/entity record.'),
  ('brand','ENTITY','brands','public.brands.status',true,true,true,'Catalog master/entity record.'),
  ('offer','ENTITY','offers','public.offers.status',true,true,true,'Commercial entity record.'),
  ('content','ENTITY','contents','public.contents.status',true,true,true,'Content entity record.'),
  ('origin_claim','ENTITY','origin_claims','public.origin_claims.status',true,true,true,'Provenance-sensitive origin entity.'),
  ('partner_submission','WORKFLOW','partner_submissions','public.partner_submissions.status',true,false,false,'Registered for lifecycle mapping; not yet included in the common envelope projection.')
on conflict (object_type) do update set
  domain=excluded.domain,
  source_schema=excluded.source_schema,
  source_relation=excluded.source_relation,
  id_column=excluded.id_column,
  lifecycle_source=excluded.lifecycle_source,
  provenance_required=excluded.provenance_required,
  retention_applicable=excluded.retention_applicable,
  envelope_supported=excluded.envelope_supported,
  baseline_version=excluded.baseline_version,
  notes=excluded.notes;

create table if not exists public.lifecycle_state_mappings (
  object_type text not null references public.governed_object_type_registry(object_type) on delete restrict,
  source_state text not null,
  canonical_phase text not null references public.canonical_lifecycle_registry(phase) on delete restrict,
  mapping_kind text not null default 'legacy_status',
  notes text,
  baseline_version text not null default 'EA-BASELINE-001.v1.0',
  created_at timestamptz not null default now(),
  primary key (object_type, source_state),
  constraint lifecycle_mapping_kind_check check (mapping_kind in ('legacy_status','derived_state','implicit_state','workflow_state'))
);

alter table public.lifecycle_state_mappings enable row level security;
revoke all on public.lifecycle_state_mappings from public, anon;
grant select on public.lifecycle_state_mappings to authenticated;
drop policy if exists lifecycle_state_mappings_authenticated_select on public.lifecycle_state_mappings;
create policy lifecycle_state_mappings_authenticated_select
  on public.lifecycle_state_mappings for select to authenticated
  using (true);

insert into public.lifecycle_state_mappings(object_type,source_state,canonical_phase,mapping_kind,notes)
values
  -- DAM derived lifecycle
  ('media_asset','pending_technical_audit','VALIDATING','derived_state',null),
  ('media_asset','technical_rejected','QUARANTINE','derived_state','Restricted technical failure; no retention implication is added by this mapping alone.'),
  ('media_asset','duplicate_review','REVIEW','derived_state',null),
  ('media_asset','pending_approval','REVIEW','derived_state',null),
  ('media_asset','active','ACTIVE','derived_state',null),
  ('media_asset','legal_hold','LEGAL_HOLD','derived_state',null),
  ('media_asset','quarantine_retention','QUARANTINE','derived_state',null),
  ('media_asset','disposal_eligible','DISPOSITION_REVIEW','derived_state',null),
  ('media_asset','disposal_requested','DISPOSITION_REVIEW','derived_state',null),
  ('media_asset','disposal_approved','DISPOSITION_REVIEW','derived_state',null),
  ('media_asset','disposal_executing','DISPOSITION_REVIEW','derived_state',null),
  -- Entity publication status
  ('product','draft','INGESTED','legacy_status',null),('product','in_review','REVIEW','legacy_status',null),('product','published','PUBLISHED','legacy_status',null),('product','archived','RETAINED','legacy_status',null),('product','rejected','QUARANTINE','legacy_status','Rejected means governance-restricted, not necessarily timed media quarantine.'),
  ('organization','draft','INGESTED','legacy_status',null),('organization','in_review','REVIEW','legacy_status',null),('organization','published','PUBLISHED','legacy_status',null),('organization','archived','RETAINED','legacy_status',null),('organization','rejected','QUARANTINE','legacy_status',null),
  ('brand','draft','INGESTED','legacy_status',null),('brand','in_review','REVIEW','legacy_status',null),('brand','published','PUBLISHED','legacy_status',null),('brand','archived','RETAINED','legacy_status',null),('brand','rejected','QUARANTINE','legacy_status',null),
  ('offer','draft','INGESTED','legacy_status',null),('offer','in_review','REVIEW','legacy_status',null),('offer','published','PUBLISHED','legacy_status',null),('offer','archived','RETAINED','legacy_status',null),('offer','rejected','QUARANTINE','legacy_status',null),
  ('content','draft','INGESTED','legacy_status',null),('content','in_review','REVIEW','legacy_status',null),('content','published','PUBLISHED','legacy_status',null),('content','archived','RETAINED','legacy_status',null),('content','rejected','QUARANTINE','legacy_status',null),
  ('origin_claim','draft','INGESTED','legacy_status',null),('origin_claim','in_review','REVIEW','legacy_status',null),('origin_claim','published','PUBLISHED','legacy_status',null),('origin_claim','archived','RETAINED','legacy_status',null),('origin_claim','rejected','QUARANTINE','legacy_status',null),
  -- Records / intake
  ('source_record','captured','INGESTED','implicit_state','Temporary canonical projection until explicit records lifecycle is introduced.'),
  ('data_import_batch','draft','INGESTED','workflow_state',null),('data_import_batch','imported','ACTIVE','workflow_state',null),('data_import_batch','archived','RETAINED','workflow_state',null),
  ('data_intake_row','pending','VALIDATING','workflow_state',null),('data_intake_row','warning','REVIEW','workflow_state',null),('data_intake_row','invalid','REVIEW','workflow_state','Invalid row remains reviewable/rejectable; mapping does not itself quarantine.'),('data_intake_row','imported','ACTIVE','workflow_state',null),
  -- Common partner submission states retained as registered workflow mappings when present
  ('partner_submission','draft','INGESTED','workflow_state',null),('partner_submission','submitted','REVIEW','workflow_state',null),('partner_submission','in_review','REVIEW','workflow_state',null),('partner_submission','approved','ACTIVE','workflow_state',null),('partner_submission','rejected','QUARANTINE','workflow_state',null),('partner_submission','withdrawn','RETAINED','workflow_state',null)
on conflict (object_type,source_state) do update set
  canonical_phase=excluded.canonical_phase,
  mapping_kind=excluded.mapping_kind,
  notes=excluded.notes,
  baseline_version=excluded.baseline_version;

create or replace function public.canonical_lifecycle_phase(p_object_type text, p_source_state text)
returns text
language sql
stable
security invoker
set search_path=''
as $$
  select m.canonical_phase
  from public.lifecycle_state_mappings m
  where m.object_type=p_object_type and m.source_state=p_source_state
$$;
revoke all on function public.canonical_lifecycle_phase(text,text) from public, anon;
grant execute on function public.canonical_lifecycle_phase(text,text) to authenticated;

create or replace function public.governance_kernel_revision()
returns text
language sql
immutable
security invoker
set search_path=''
as $$ select 'wave-a.phase1.v1'::text $$;
revoke all on function public.governance_kernel_revision() from public, anon;
grant execute on function public.governance_kernel_revision() to authenticated;

create or replace view public.governed_object_envelope
with (security_invoker=true)
as
select
  'DAM'::text domain,
  'media_asset'::text object_type,
  a.id object_id,
  l.lifecycle_state source_state,
  public.canonical_lifecycle_phase('media_asset',l.lifecycle_state) canonical_phase,
  a.uploaded_by owner_actor_id,
  a.created_at,
  a.updated_at,
  jsonb_build_object(
    'technical_status',a.technical_status,
    'publication_status',a.publication_status,
    'legal_hold',a.legal_hold,
    'retention_expires_at',a.retention_expires_at,
    'sha256_hex',a.sha256_hex,
    'original_filename',a.original_filename,
    'traceability_source','media_ingestion_events'
  ) governance_metadata
from public.media_assets a
join public.media_asset_lifecycle l on l.asset_id=a.id
union all
select
  'RECORD','source_record',s.id,'captured',
  public.canonical_lifecycle_phase('source_record','captured'),
  s.created_by,s.created_at,s.created_at,
  jsonb_build_object('source_type',s.source_type,'url',s.url,'publisher',s.publisher,'checksum',s.checksum,'accessed_at',s.accessed_at)
from public.source_records s
union all
select
  'INTAKE','data_import_batch',b.id,b.status,
  public.canonical_lifecycle_phase('data_import_batch',b.status),
  coalesce(b.imported_by,b.created_by),b.created_at,b.updated_at,
  jsonb_build_object('entity_type',b.entity_type,'batch_code',b.batch_code,'source_record_id',b.source_record_id,'total_rows',b.total_rows,'valid_rows',b.valid_rows,'rejected_rows',b.rejected_rows)
from public.data_import_batches b
union all
select
  'INTAKE','data_intake_row',r.id,r.validation_status,
  public.canonical_lifecycle_phase('data_intake_row',r.validation_status),
  r.reviewed_by,r.created_at,r.updated_at,
  jsonb_build_object('batch_id',r.batch_id,'source_row_number',r.source_row_number,'target_table',r.target_table,'target_id',r.target_id,'reviewed_at',r.reviewed_at)
from public.data_intake_rows r
union all
select 'ENTITY','product',p.id,p.status::text,public.canonical_lifecycle_phase('product',p.status::text),p.created_by,p.created_at,p.updated_at,
  jsonb_build_object('verification_tier',p.verification_tier,'published_at',p.published_at,'archived_at',p.archived_at,'owner_organization_id',p.owner_organization_id)
from public.products p
union all
select 'ENTITY','organization',o.id,o.status::text,public.canonical_lifecycle_phase('organization',o.status::text),o.created_by,o.created_at,o.updated_at,
  jsonb_build_object('verification_tier',o.verification_tier,'published_at',o.published_at,'archived_at',o.archived_at)
from public.organizations o
union all
select 'ENTITY','brand',b.id,b.status::text,public.canonical_lifecycle_phase('brand',b.status::text),null::uuid,b.created_at,b.updated_at,
  jsonb_build_object('manufacturer_organization_id',b.manufacturer_organization_id)
from public.brands b
union all
select 'ENTITY','offer',o.id,o.status::text,public.canonical_lifecycle_phase('offer',o.status::text),null::uuid,o.created_at,o.updated_at,
  jsonb_build_object('product_id',o.product_id,'seller_organization_id',o.seller_organization_id,'source_record_id',o.source_record_id,'observed_at',o.observed_at)
from public.offers o
union all
select 'ENTITY','content',c.id,c.status::text,public.canonical_lifecycle_phase('content',c.status::text),c.author_profile_id,c.created_at,c.updated_at,
  jsonb_build_object('published_at',c.published_at,'content_type',c.type)
from public.contents c
union all
select 'ENTITY','origin_claim',o.id,o.status::text,public.canonical_lifecycle_phase('origin_claim',o.status::text),null::uuid,o.created_at,o.updated_at,
  jsonb_build_object('product_id',o.product_id,'source_record_id',o.source_record_id,'verification_tier',o.verification_tier)
from public.origin_claims o;

revoke all on public.governed_object_envelope from public, anon;
grant select on public.governed_object_envelope to authenticated;

comment on table public.canonical_lifecycle_registry is 'EA Baseline v1.0 canonical enterprise lifecycle vocabulary. Additive governance kernel; does not replace legacy states directly.';
comment on table public.governed_object_type_registry is 'Registry of governed object classes and their authoritative lifecycle sources.';
comment on table public.lifecycle_state_mappings is 'Mapping from domain/legacy lifecycle values to EA Baseline canonical lifecycle phases.';
comment on view public.governed_object_envelope is 'Read-only normalized governance projection across DAM, Records, Intake and core Entities.';

commit;
