-- Wave C / Phase 7 — OAIS-aligned Preservation Capability
-- ISO 14721:2025 alignment: preservation packages, fixity, provenance,
-- representation information, preservation events, and dissemination evidence.
-- This does not claim ISO certification; it implements enforceable OAIS-aligned controls.

begin;

create table if not exists public.oais_preservation_packages (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  package_type text not null check (package_type in ('SIP','AIP','DIP')),
  package_version integer not null check (package_version > 0),
  source_package_id uuid null references public.oais_preservation_packages(id) on delete restrict,
  content_sha256_hex text not null check (content_sha256_hex ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size > 0),
  manifest jsonb not null,
  representation_information jsonb not null default '{}'::jsonb,
  preservation_description_information jsonb not null default '{}'::jsonb,
  designated_community text not null default 'coffee-platform-governed-users',
  created_by uuid null references public.profiles(id) on delete restrict,
  service_actor text null,
  created_at timestamptz not null default now(),
  unique(asset_id, package_type, package_version),
  constraint oais_package_actor_check check (created_by is not null or service_actor is not null)
);

create index if not exists oais_preservation_packages_asset_idx
  on public.oais_preservation_packages(asset_id, package_type, package_version desc);

alter table public.oais_preservation_packages enable row level security;
revoke all on public.oais_preservation_packages from public, anon, authenticated;
grant select, insert on public.oais_preservation_packages to authenticated;

drop policy if exists oais_packages_staff_read on public.oais_preservation_packages;
create policy oais_packages_staff_read on public.oais_preservation_packages
  for select to authenticated using ((select private.is_staff()));

drop policy if exists oais_packages_verifier_insert on public.oais_preservation_packages;
create policy oais_packages_verifier_insert on public.oais_preservation_packages
  for insert to authenticated
  with check (
    (select private.is_staff(array['verifier','admin']::public.staff_role[]))
    and created_by=(select auth.uid())
    and service_actor is null
  );

create table if not exists public.oais_preservation_events (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.oais_preservation_packages(id) on delete restrict,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  event_type text not null check (event_type in ('AIP_CREATED','FIXITY_CHECKED','DIP_CREATED','PRESERVATION_MIGRATION','PRESERVATION_NOTE')),
  outcome text not null check (outcome in ('success','failure','recorded')),
  expected_sha256_hex text null check (expected_sha256_hex is null or expected_sha256_hex ~ '^[0-9a-f]{64}$'),
  observed_sha256_hex text null check (observed_sha256_hex is null or observed_sha256_hex ~ '^[0-9a-f]{64}$'),
  detail jsonb not null default '{}'::jsonb,
  actor_user_id uuid null references public.profiles(id) on delete restrict,
  service_actor text null,
  occurred_at timestamptz not null default now(),
  constraint oais_event_actor_check check (actor_user_id is not null or service_actor is not null)
);

create index if not exists oais_preservation_events_package_idx
  on public.oais_preservation_events(package_id, occurred_at desc);
create index if not exists oais_preservation_events_asset_idx
  on public.oais_preservation_events(asset_id, occurred_at desc);

alter table public.oais_preservation_events enable row level security;
revoke all on public.oais_preservation_events from public, anon, authenticated;
grant select, insert on public.oais_preservation_events to authenticated;

drop policy if exists oais_events_staff_read on public.oais_preservation_events;
create policy oais_events_staff_read on public.oais_preservation_events
  for select to authenticated using ((select private.is_staff()));

drop policy if exists oais_events_verifier_insert on public.oais_preservation_events;
create policy oais_events_verifier_insert on public.oais_preservation_events
  for insert to authenticated
  with check (
    (select private.is_staff(array['verifier','admin']::public.staff_role[]))
    and actor_user_id=(select auth.uid())
    and service_actor is null
  );

create or replace function private.block_oais_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  raise exception 'immutable_preservation_history' using errcode='55000';
end $$;
revoke all on function private.block_oais_history_mutation() from public, anon, authenticated;

drop trigger if exists immutable_oais_package on public.oais_preservation_packages;
create trigger immutable_oais_package
before update or delete on public.oais_preservation_packages
for each row execute function private.block_oais_history_mutation();

drop trigger if exists immutable_oais_event on public.oais_preservation_events;
create trigger immutable_oais_event
before update or delete on public.oais_preservation_events
for each row execute function private.block_oais_history_mutation();

-- Backfill one immutable AIP for each existing fixity-ready asset. No bytes are duplicated;
-- the package is an archival manifest bound to the authoritative Media Vault object identity.
insert into public.oais_preservation_packages(
  asset_id,package_type,package_version,content_sha256_hex,byte_size,manifest,
  representation_information,preservation_description_information,service_actor
)
select
  a.id,'AIP',1,lower(a.sha256_hex),a.byte_size,
  jsonb_build_object(
    'asset_id',a.id,
    'original_filename',a.original_filename,
    'purpose',a.purpose,
    'declared_mime',a.declared_mime,
    'detected_mime',a.detected_mime,
    'width',a.width,
    'height',a.height,
    'original_storage_path',a.original_storage_path,
    'sanitized_storage_path',a.sanitized_storage_path,
    'published_storage_path',a.published_storage_path,
    'technical_status',a.technical_status,
    'publication_status',a.publication_status,
    'captured_at',a.created_at,
    'fixity_algorithm','SHA-256'
  ),
  jsonb_build_object(
    'mime',coalesce(a.detected_mime,a.declared_mime),
    'dimensions',jsonb_build_object('width',a.width,'height',a.height),
    'technical_report',coalesce(a.technical_report,'{}'::jsonb)
  ),
  jsonb_build_object(
    'provenance',jsonb_build_object('uploaded_by',a.uploaded_by,'ingestion_events','public.media_ingestion_events'),
    'reference',jsonb_build_object('media_asset_id',a.id),
    'context',jsonb_build_object('platform','coffee-platform-v1','domain','DAM'),
    'fixity',jsonb_build_object('algorithm','SHA-256','digest',lower(a.sha256_hex))
  ),
  'migration_053'
from public.media_assets a
where a.sha256_hex is not null
  and a.sha256_hex ~ '^[0-9A-Fa-f]{64}$'
  and a.byte_size > 0
  and not exists (
    select 1 from public.oais_preservation_packages p
    where p.asset_id=a.id and p.package_type='AIP'
  );

insert into public.oais_preservation_events(package_id,asset_id,event_type,outcome,expected_sha256_hex,observed_sha256_hex,detail,service_actor,occurred_at)
select p.id,p.asset_id,'AIP_CREATED','success',p.content_sha256_hex,p.content_sha256_hex,
       jsonb_build_object('source','migration_backfill','package_version',p.package_version),
       'migration_053',p.created_at
from public.oais_preservation_packages p
where p.package_type='AIP'
  and p.service_actor='migration_053'
  and not exists (
    select 1 from public.oais_preservation_events e
    where e.package_id=p.id and e.event_type='AIP_CREATED'
  );

create or replace function public.admin_create_oais_aip(
  p_asset_id uuid,
  p_representation_information jsonb default '{}'::jsonb,
  p_preservation_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_asset public.media_assets;
  v_lifecycle text;
  v_version integer;
  v_package public.oais_preservation_packages;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;

  select * into v_asset from public.media_assets where id=p_asset_id for share;
  if v_asset.id is null then raise exception 'asset_not_found'; end if;
  if v_asset.sha256_hex is null or v_asset.sha256_hex !~ '^[0-9A-Fa-f]{64}$' or coalesce(v_asset.byte_size,0)<=0 then
    raise exception 'asset_fixity_incomplete';
  end if;

  select lifecycle_state into v_lifecycle from public.media_asset_lifecycle where asset_id=p_asset_id;
  if v_lifecycle in ('disposal_executing') then raise exception 'asset_disposition_in_progress'; end if;

  select coalesce(max(package_version),0)+1 into v_version
  from public.oais_preservation_packages where asset_id=p_asset_id and package_type='AIP';

  insert into public.oais_preservation_packages(
    asset_id,package_type,package_version,content_sha256_hex,byte_size,manifest,
    representation_information,preservation_description_information,created_by
  ) values (
    p_asset_id,'AIP',v_version,lower(v_asset.sha256_hex),v_asset.byte_size,
    jsonb_build_object(
      'asset_id',v_asset.id,'original_filename',v_asset.original_filename,'purpose',v_asset.purpose,
      'declared_mime',v_asset.declared_mime,'detected_mime',v_asset.detected_mime,
      'width',v_asset.width,'height',v_asset.height,'original_storage_path',v_asset.original_storage_path,
      'sanitized_storage_path',v_asset.sanitized_storage_path,'published_storage_path',v_asset.published_storage_path,
      'technical_status',v_asset.technical_status,'publication_status',v_asset.publication_status,
      'lifecycle_state',v_lifecycle,'captured_at',v_asset.created_at,'fixity_algorithm','SHA-256'
    ),
    coalesce(p_representation_information,'{}'::jsonb) || jsonb_build_object(
      'mime',coalesce(v_asset.detected_mime,v_asset.declared_mime),
      'dimensions',jsonb_build_object('width',v_asset.width,'height',v_asset.height)
    ),
    coalesce(p_preservation_context,'{}'::jsonb) || jsonb_build_object(
      'provenance',jsonb_build_object('uploaded_by',v_asset.uploaded_by,'ingestion_events','public.media_ingestion_events'),
      'reference',jsonb_build_object('media_asset_id',v_asset.id),
      'fixity',jsonb_build_object('algorithm','SHA-256','digest',lower(v_asset.sha256_hex))
    ),
    v_actor
  ) returning * into v_package;

  insert into public.oais_preservation_events(package_id,asset_id,event_type,outcome,expected_sha256_hex,observed_sha256_hex,detail,actor_user_id)
  values(v_package.id,p_asset_id,'AIP_CREATED','success',v_package.content_sha256_hex,v_package.content_sha256_hex,
         jsonb_build_object('package_version',v_package.package_version,'lifecycle_state',v_lifecycle),v_actor);

  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values('oais_aip_created','media_asset',p_asset_id::text,v_actor,'oais_preservation_packages',v_package.id::text,'preservation',now(),
         jsonb_build_object('package_id',v_package.id,'package_version',v_package.package_version,'sha256',v_package.content_sha256_hex),'oais-iso14721-2025-v1');

  return jsonb_build_object('ok',true,'package_id',v_package.id,'package_type','AIP','package_version',v_package.package_version);
end $$;
revoke all on function public.admin_create_oais_aip(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_create_oais_aip(uuid,jsonb,jsonb) to authenticated;

create or replace function public.admin_verify_oais_fixity(p_package_id uuid,p_observed_sha256_hex text,p_note text default null)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_package public.oais_preservation_packages;
  v_observed text := lower(trim(coalesce(p_observed_sha256_hex,'')));
  v_outcome text;
  v_event public.oais_preservation_events;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;
  if v_observed !~ '^[0-9a-f]{64}$' then raise exception 'invalid_sha256'; end if;
  select * into v_package from public.oais_preservation_packages where id=p_package_id;
  if v_package.id is null then raise exception 'preservation_package_not_found'; end if;
  v_outcome := case when v_observed=v_package.content_sha256_hex then 'success' else 'failure' end;

  insert into public.oais_preservation_events(package_id,asset_id,event_type,outcome,expected_sha256_hex,observed_sha256_hex,detail,actor_user_id)
  values(v_package.id,v_package.asset_id,'FIXITY_CHECKED',v_outcome,v_package.content_sha256_hex,v_observed,
         jsonb_build_object('note',nullif(trim(coalesce(p_note,'')),'')),v_actor)
  returning * into v_event;

  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values('oais_fixity_checked','media_asset',v_package.asset_id::text,v_actor,'oais_preservation_events',v_event.id::text,'preservation',v_event.occurred_at,
         jsonb_build_object('package_id',v_package.id,'outcome',v_outcome,'expected_sha256',v_package.content_sha256_hex,'observed_sha256',v_observed),'oais-iso14721-2025-v1');

  return jsonb_build_object('ok',v_outcome='success','outcome',v_outcome,'event_id',v_event.id,'package_id',v_package.id);
end $$;
revoke all on function public.admin_verify_oais_fixity(uuid,text,text) from public,anon;
grant execute on function public.admin_verify_oais_fixity(uuid,text,text) to authenticated;

create or replace function public.admin_create_oais_dip(p_aip_package_id uuid,p_purpose text,p_designated_community text default 'coffee-platform-governed-users')
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_aip public.oais_preservation_packages;
  v_version integer;
  v_dip public.oais_preservation_packages;
  v_event public.oais_preservation_events;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;
  if length(trim(coalesce(p_purpose,'')))<5 then raise exception 'dissemination_purpose_required'; end if;
  select * into v_aip from public.oais_preservation_packages where id=p_aip_package_id and package_type='AIP';
  if v_aip.id is null then raise exception 'aip_package_not_found'; end if;
  select coalesce(max(package_version),0)+1 into v_version
  from public.oais_preservation_packages where asset_id=v_aip.asset_id and package_type='DIP';

  insert into public.oais_preservation_packages(
    asset_id,package_type,package_version,source_package_id,content_sha256_hex,byte_size,manifest,
    representation_information,preservation_description_information,designated_community,created_by
  ) values (
    v_aip.asset_id,'DIP',v_version,v_aip.id,v_aip.content_sha256_hex,v_aip.byte_size,
    v_aip.manifest || jsonb_build_object('dissemination_purpose',trim(p_purpose),'source_aip_id',v_aip.id),
    v_aip.representation_information,
    v_aip.preservation_description_information || jsonb_build_object('disseminated_from_aip',v_aip.id),
    coalesce(nullif(trim(p_designated_community),''),'coffee-platform-governed-users'),v_actor
  ) returning * into v_dip;

  insert into public.oais_preservation_events(package_id,asset_id,event_type,outcome,expected_sha256_hex,observed_sha256_hex,detail,actor_user_id)
  values(v_dip.id,v_dip.asset_id,'DIP_CREATED','success',v_dip.content_sha256_hex,v_dip.content_sha256_hex,
         jsonb_build_object('source_aip_id',v_aip.id,'purpose',trim(p_purpose),'designated_community',v_dip.designated_community),v_actor)
  returning * into v_event;

  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values('oais_dip_created','media_asset',v_dip.asset_id::text,v_actor,'oais_preservation_events',v_event.id::text,'preservation',v_event.occurred_at,
         jsonb_build_object('aip_package_id',v_aip.id,'dip_package_id',v_dip.id,'purpose',trim(p_purpose),'designated_community',v_dip.designated_community),'oais-iso14721-2025-v1');

  return jsonb_build_object('ok',true,'package_id',v_dip.id,'package_type','DIP','package_version',v_dip.package_version,'source_aip_id',v_aip.id);
end $$;
revoke all on function public.admin_create_oais_dip(uuid,text,text) from public,anon;
grant execute on function public.admin_create_oais_dip(uuid,text,text) to authenticated;

create or replace view public.oais_preservation_inventory
with (security_invoker=true)
as
select
  p.id package_id,p.asset_id,p.package_type,p.package_version,p.source_package_id,
  p.content_sha256_hex,p.byte_size,p.designated_community,p.created_at,
  l.lifecycle_state,
  public.canonical_lifecycle_phase('media_asset',l.lifecycle_state) canonical_phase,
  (
    select e.outcome from public.oais_preservation_events e
    where e.package_id=p.id and e.event_type='FIXITY_CHECKED'
    order by e.occurred_at desc limit 1
  ) latest_fixity_outcome,
  (
    select e.occurred_at from public.oais_preservation_events e
    where e.package_id=p.id and e.event_type='FIXITY_CHECKED'
    order by e.occurred_at desc limit 1
  ) latest_fixity_at,
  p.manifest,p.representation_information,p.preservation_description_information
from public.oais_preservation_packages p
join public.media_asset_lifecycle l on l.asset_id=p.asset_id;

revoke all on public.oais_preservation_inventory from public,anon,authenticated;
grant select on public.oais_preservation_inventory to authenticated;

commit;
