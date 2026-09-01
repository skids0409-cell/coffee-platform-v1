-- Coffee Platform V1 — Phase 3 governed Media Vault and ingestion pipeline
-- Private quarantine, immutable technical evidence, governed links and legal cases.
begin;

create table public.media_upload_intents (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('master_product','vendor_offer','organization_profile','brand_identity','editorial','origin_evidence','document_evidence')),
  entity_type text not null check (entity_type in ('organizations','brands','products','offers','contents','origin_claims')),
  entity_id uuid not null,
  link_role text not null check (link_role in ('primary','gallery','logo','hero','evidence','document')),
  original_filename text not null check (length(original_filename) between 1 and 255),
  declared_mime text not null,
  quarantine_path text not null unique,
  max_bytes bigint not null check (max_bytes between 1 and 20971520),
  alt_ar text not null check (length(trim(alt_ar)) >= 2),
  alt_en text,
  rights_basis text not null check (rights_basis in ('creator_owned','explicit_written_permission','exclusive_license','nonexclusive_license','manufacturer_press_kit','open_license','public_domain')),
  copyright_owner text not null check (length(trim(copyright_owner)) >= 2),
  source_url text,
  license_url text,
  permission_evidence text,
  commercial_use_allowed boolean not null,
  modification_allowed boolean not null,
  attestation_version text not null check (length(attestation_version) between 3 and 80),
  attested_by uuid not null references public.profiles(id) on delete restrict,
  attested_at timestamptz not null default now(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'created' check (status in ('created','uploaded','validated','rejected','expired')),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (attested_by = uploaded_by),
  check (commercial_use_allowed),
  check (modification_allowed),
  check (source_url is null or source_url ~ '^https://'),
  check (license_url is null or license_url ~ '^https://'),
  check (rights_basis <> 'open_license' or license_url is not null),
  check (rights_basis not in ('explicit_written_permission','exclusive_license','nonexclusive_license') or permission_evidence is not null)
);

create table public.media_assets (
  id uuid primary key,
  purpose text not null check (purpose in ('master_product','vendor_offer','organization_profile','brand_identity','editorial','origin_evidence','document_evidence')),
  original_storage_path text not null unique,
  sanitized_storage_path text unique,
  published_storage_path text unique,
  original_filename text not null,
  declared_mime text not null,
  detected_mime text,
  byte_size bigint check (byte_size is null or byte_size > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  pixel_count bigint generated always as (
    case when width is not null and height is not null then width::bigint * height::bigint else null end
  ) stored,
  page_count integer check (page_count is null or page_count > 0),
  sha256_hex text check (sha256_hex is null or sha256_hex ~ '^[0-9a-f]{64}$'),
  duplicate_of_asset_id uuid references public.media_assets(id) on delete restrict,
  technical_status text not null check (technical_status in ('validating','passed','rejected','duplicate')),
  publication_status text not null default 'private' check (publication_status in ('private','ready_for_review','publishing','published','restricted','rejected','archived')),
  rejection_codes text[] not null default '{}',
  technical_report jsonb not null default '{}'::jsonb,
  legal_hold boolean not null default false,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  validated_at timestamptz,
  approved_by uuid references public.profiles(id) on delete restrict,
  approved_at timestamptz,
  published_at timestamptz,
  restricted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (id <> duplicate_of_asset_id),
  check (detected_mime <> 'application/pdf' or (width is null and height is null)),
  check (detected_mime = 'application/pdf' or technical_status in ('validating','rejected') or (width is not null and height is not null)),
  check (technical_status <> 'passed' or (sha256_hex is not null and validated_at is not null and array_length(rejection_codes,1) is null)),
  check (technical_status <> 'duplicate' or duplicate_of_asset_id is not null),
  check (publication_status <> 'published' or (published_storage_path is not null and approved_by is not null and published_at is not null))
);

create unique index media_assets_canonical_sha256_idx
  on public.media_assets(sha256_hex)
  where sha256_hex is not null and duplicate_of_asset_id is null and technical_status='passed';
create index media_assets_review_queue_idx on public.media_assets(publication_status,created_at);
create index media_assets_duplicate_idx on public.media_assets(duplicate_of_asset_id) where duplicate_of_asset_id is not null;

create table public.media_asset_links (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  entity_type text not null check (entity_type in ('organizations','brands','products','offers','contents','origin_claims')),
  entity_id uuid not null,
  role text not null check (role in ('primary','gallery','logo','hero','evidence','document')),
  is_primary boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  alt_ar text not null check (length(trim(alt_ar)) >= 2),
  alt_en text,
  caption_ar text,
  caption_en text,
  link_status text not null default 'pending' check (link_status in ('pending','active','suppressed','removed')),
  linked_by uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(asset_id,entity_type,entity_id,role)
);
create index media_asset_links_target_idx on public.media_asset_links(entity_type,entity_id,link_status,sort_order);
create unique index media_asset_links_one_primary_idx
  on public.media_asset_links(entity_type,entity_id,role)
  where is_primary and link_status in ('pending','active');

create table public.media_rights_assertions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  rights_basis text not null check (rights_basis in ('creator_owned','explicit_written_permission','exclusive_license','nonexclusive_license','manufacturer_press_kit','open_license','public_domain')),
  copyright_owner text not null,
  source_url text,
  license_url text,
  permission_evidence text,
  territory text,
  valid_from date,
  expires_at date,
  commercial_use_allowed boolean not null,
  modification_allowed boolean not null,
  attestation_version text not null,
  attested_by uuid not null references public.profiles(id) on delete restrict,
  attested_at timestamptz not null,
  review_status text not null default 'pending' check (review_status in ('pending','accepted','rejected','expired')),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check (source_url is null or source_url ~ '^https://'),
  check (license_url is null or license_url ~ '^https://'),
  check (rights_basis <> 'open_license' or license_url is not null),
  check (rights_basis not in ('explicit_written_permission','exclusive_license','nonexclusive_license') or permission_evidence is not null),
  check (review_status = 'pending' or reviewed_at is not null)
);
create index media_rights_asset_status_idx on public.media_rights_assertions(asset_id,review_status);

create table public.media_ingestion_events (
  id bigint generated always as identity primary key,
  asset_id uuid references public.media_assets(id) on delete restrict,
  upload_intent_id uuid references public.media_upload_intents(id) on delete restrict,
  event_type text not null,
  previous_state text,
  next_state text not null,
  actor_user_id uuid references public.profiles(id) on delete restrict,
  service_actor text,
  policy_version text not null,
  correlation_id uuid not null,
  technical_report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (asset_id is not null or upload_intent_id is not null),
  check (actor_user_id is not null or service_actor is not null)
);
create index media_ingestion_events_asset_idx on public.media_ingestion_events(asset_id,created_at);
create index media_ingestion_events_intent_idx on public.media_ingestion_events(upload_intent_id,created_at);

create table public.media_legal_cases (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique default ('MLC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  notice_type text not null check (notice_type in ('copyright','trademark','privacy','publicity','other')),
  claimant_name text not null,
  claimant_email text not null,
  claimant_authority text not null,
  claimed_work text not null,
  complaint_text text not null,
  jurisdiction text,
  evidence jsonb not null default '[]'::jsonb,
  good_faith_statement boolean not null,
  accuracy_statement boolean not null,
  electronic_signature text not null,
  status text not null default 'received' check (status in ('received','more_information_required','triaged_valid','access_restricted','awaiting_response','disputed','removal_confirmed','restoration_approved','closed_restored','closed_removed')),
  legal_hold boolean not null default true,
  submitted_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  received_at timestamptz not null default now(),
  due_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (claimant_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  check (good_faith_statement and accuracy_statement),
  check ((status like 'closed_%') = (closed_at is not null))
);

create table public.media_legal_case_assets (
  case_id uuid not null references public.media_legal_cases(id) on delete restrict,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  access_restricted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(case_id,asset_id)
);

create table public.media_legal_case_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references public.media_legal_cases(id) on delete restrict,
  event_type text not null,
  previous_status text,
  next_status text not null,
  note text,
  evidence jsonb not null default '[]'::jsonb,
  actor_user_id uuid references public.profiles(id) on delete restrict,
  service_actor text,
  created_at timestamptz not null default now(),
  check (actor_user_id is not null or service_actor is not null)
);
create index media_legal_case_events_case_idx on public.media_legal_case_events(case_id,created_at);

create or replace function private.media_target_exists(p_entity_type text,p_entity_id uuid)
returns boolean language plpgsql stable security invoker set search_path='' as $$
begin
  if p_entity_type='products' then return exists(select 1 from public.products where id=p_entity_id);
  elsif p_entity_type='organizations' then return exists(select 1 from public.organizations where id=p_entity_id);
  elsif p_entity_type='brands' then return exists(select 1 from public.brands where id=p_entity_id);
  elsif p_entity_type='offers' then return exists(select 1 from public.offers where id=p_entity_id);
  elsif p_entity_type='contents' then return exists(select 1 from public.contents where id=p_entity_id);
  elsif p_entity_type='origin_claims' then return exists(select 1 from public.origin_claims where id=p_entity_id);
  end if;
  return false;
end $$;

create or replace function private.assert_media_link_target()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if not private.media_target_exists(new.entity_type,new.entity_id) then raise exception 'invalid_media_target'; end if;
  return new;
end $$;
create trigger media_asset_links_target_guard before insert or update of entity_type,entity_id on public.media_asset_links
for each row execute function private.assert_media_link_target();

create or replace function public.admin_media_begin_ingestion(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_purpose text := p_payload->>'purpose';
  v_entity text := p_payload->>'entity_type';
  v_entity_id uuid := nullif(p_payload->>'entity_id','')::uuid;
  v_role text := p_payload->>'role';
  v_mime text := lower(trim(p_payload->>'declared_mime'));
  v_max bigint;
  v_ext text;
  v_path text;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if not private.media_target_exists(v_entity,v_entity_id) then raise exception 'invalid_media_target'; end if;
  if coalesce((p_payload->>'attested')::boolean,false) is not true then raise exception 'attestation_required'; end if;
  if coalesce((p_payload->>'commercial_use_allowed')::boolean,false) is not true or coalesce((p_payload->>'modification_allowed')::boolean,false) is not true then raise exception 'rights_scope_insufficient'; end if;
  if v_purpose='organization_profile' or v_purpose='brand_identity' then v_max:=4194304;
  elsif v_purpose='editorial' then v_max:=12582912;
  elsif v_purpose='document_evidence' then v_max:=20971520;
  else v_max:=8388608; end if;
  if v_mime='image/jpeg' then v_ext:='jpg'; elsif v_mime='image/png' then v_ext:='png'; elsif v_mime='image/webp' then v_ext:='webp'; elsif v_mime='image/avif' then v_ext:='avif'; elsif v_mime='application/pdf' and v_purpose='document_evidence' then v_ext:='pdf'; else raise exception 'unsupported_declared_mime'; end if;
  if v_purpose='document_evidence' and v_role <> 'document' then raise exception 'invalid_media_role'; end if;
  if v_purpose<>'document_evidence' and v_role='document' then raise exception 'invalid_media_role'; end if;
  v_path := concat(v_actor::text,'/',v_id::text,'/original.',v_ext);
  insert into public.media_upload_intents(id,purpose,entity_type,entity_id,link_role,original_filename,declared_mime,quarantine_path,max_bytes,alt_ar,alt_en,rights_basis,copyright_owner,source_url,license_url,permission_evidence,commercial_use_allowed,modification_allowed,attestation_version,attested_by,uploaded_by)
  values(v_id,v_purpose,v_entity,v_entity_id,v_role,left(trim(p_payload->>'original_filename'),255),v_mime,v_path,v_max,trim(p_payload->>'alt_ar'),nullif(trim(p_payload->>'alt_en'),''),p_payload->>'rights_basis',trim(p_payload->>'copyright_owner'),nullif(trim(p_payload->>'source_url'),''),nullif(trim(p_payload->>'license_url'),''),nullif(trim(p_payload->>'permission_evidence'),''),true,true,p_payload->>'attestation_version',v_actor,v_actor);
  insert into public.media_ingestion_events(upload_intent_id,event_type,next_state,actor_user_id,policy_version,correlation_id,technical_report)
  values(v_id,'intent_created','INTENT_CREATED',v_actor,'phase3-v1',v_id,jsonb_build_object('purpose',v_purpose,'declared_mime',v_mime,'max_bytes',v_max));
  return jsonb_build_object('intent_id',v_id,'quarantine_path',v_path,'max_bytes',v_max,'expires_at',now()+interval '2 hours');
end $$;

create or replace function public.admin_media_complete_validation(p_intent_id uuid,p_report jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  v_actor uuid := auth.uid();
  v_intent public.media_upload_intents%rowtype;
  v_passed boolean := coalesce((p_report->>'passed')::boolean,false);
  v_duplicate uuid := nullif(p_report->>'duplicate_of_asset_id','')::uuid;
  v_status text;
  v_publication text;
  v_primary boolean;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  select * into v_intent from public.media_upload_intents where id=p_intent_id and uploaded_by=v_actor for update;
  if not found then raise exception 'intent_not_found'; end if;
  if v_intent.status <> 'created' or v_intent.expires_at < now() then raise exception 'intent_not_active'; end if;
  if not exists(select 1 from storage.objects where bucket_id='media-quarantine' and name=v_intent.quarantine_path) then raise exception 'quarantine_object_missing'; end if;
  if v_passed and nullif(p_report->>'sha256_hex','') is null then raise exception 'checksum_required'; end if;
  if v_duplicate is not null and not exists(select 1 from public.media_assets where id=v_duplicate and sha256_hex=p_report->>'sha256_hex' and technical_status='passed') then raise exception 'invalid_duplicate_target'; end if;
  v_status := case when not v_passed then 'rejected' when v_duplicate is not null then 'duplicate' else 'passed' end;
  v_publication := case when not v_passed then 'rejected' when v_duplicate is not null then 'private' else 'ready_for_review' end;
  insert into public.media_assets(id,purpose,original_storage_path,sanitized_storage_path,original_filename,declared_mime,detected_mime,byte_size,width,height,page_count,sha256_hex,duplicate_of_asset_id,technical_status,publication_status,rejection_codes,technical_report,uploaded_by,validated_at)
  values(v_intent.id,v_intent.purpose,v_intent.quarantine_path,nullif(p_report->>'sanitized_storage_path',''),v_intent.original_filename,v_intent.declared_mime,nullif(p_report->>'detected_mime',''),nullif(p_report->>'byte_size','')::bigint,nullif(p_report->>'width','')::integer,nullif(p_report->>'height','')::integer,nullif(p_report->>'page_count','')::integer,nullif(p_report->>'sha256_hex',''),v_duplicate,v_status,v_publication,coalesce(array(select jsonb_array_elements_text(coalesce(p_report->'rejection_codes','[]'::jsonb))),'{}'),p_report,v_actor,now());
  select not exists(select 1 from public.media_asset_links where entity_type=v_intent.entity_type and entity_id=v_intent.entity_id and is_primary and link_status in ('pending','active'))
    and not exists(select 1 from public.entity_media where entity_table=v_intent.entity_type and entity_id=v_intent.entity_id and is_primary)
  into v_primary;
  insert into public.media_asset_links(asset_id,entity_type,entity_id,role,is_primary,alt_ar,alt_en,link_status,linked_by)
  values(v_intent.id,v_intent.entity_type,v_intent.entity_id,v_intent.link_role,v_primary,v_intent.alt_ar,v_intent.alt_en,'pending',v_actor);
  insert into public.media_rights_assertions(asset_id,rights_basis,copyright_owner,source_url,license_url,permission_evidence,commercial_use_allowed,modification_allowed,attestation_version,attested_by,attested_at,review_status)
  values(v_intent.id,v_intent.rights_basis,v_intent.copyright_owner,v_intent.source_url,v_intent.license_url,v_intent.permission_evidence,v_intent.commercial_use_allowed,v_intent.modification_allowed,v_intent.attestation_version,v_intent.attested_by,v_intent.attested_at,'pending');
  update public.media_upload_intents set status=case when v_passed then 'validated' else 'rejected' end,updated_at=now() where id=v_intent.id;
  insert into public.media_ingestion_events(asset_id,upload_intent_id,event_type,previous_state,next_state,actor_user_id,service_actor,policy_version,correlation_id,technical_report)
  values(v_intent.id,v_intent.id,'technical_validation','QUARANTINED',case when v_status='passed' then 'READY_FOR_APPROVAL' when v_status='duplicate' then 'DUPLICATE_REVIEW' else 'TECHNICAL_REJECTED' end,v_actor,'media-validator','phase3-v1',v_intent.id,p_report);
  return jsonb_build_object('asset_id',v_intent.id,'technical_status',v_status,'publication_status',v_publication,'duplicate_of_asset_id',v_duplicate,'rejection_codes',coalesce(p_report->'rejection_codes','[]'::jsonb));
end $$;

create or replace function public.admin_media_prepare_publication(p_asset_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_asset public.media_assets%rowtype; v_rights public.media_rights_assertions%rowtype; v_ext text; v_path text;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'reviewer_required' using errcode='42501'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  if v_asset.technical_status<>'passed' or v_asset.publication_status<>'ready_for_review' or v_asset.sanitized_storage_path is null or v_asset.legal_hold then raise exception 'asset_not_publishable'; end if;
  select * into v_rights from public.media_rights_assertions where asset_id=p_asset_id and review_status='pending' order by created_at desc limit 1 for update;
  if not found then raise exception 'rights_assertion_missing'; end if;
  if v_rights.expires_at is not null and v_rights.expires_at < current_date then raise exception 'rights_expired'; end if;
  v_ext:=case v_asset.detected_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/avif' then 'avif' else null end;
  if v_ext is null then raise exception 'public_derivative_not_supported'; end if;
  v_path:=concat('vault/',p_asset_id::text,'/',v_asset.sha256_hex,'.',v_ext);
  update public.media_rights_assertions set review_status='accepted',reviewed_by=v_actor,reviewed_at=now() where id=v_rights.id;
  update public.media_assets set publication_status='publishing',published_storage_path=v_path,approved_by=v_actor,approved_at=now(),updated_at=now() where id=p_asset_id;
  insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report)
  values(p_asset_id,'publication_approved','READY_FOR_APPROVAL','PUBLISHING',v_actor,'phase3-v1',gen_random_uuid(),'{}');
  return jsonb_build_object('asset_id',p_asset_id,'sanitized_storage_path',v_asset.sanitized_storage_path,'published_storage_path',v_path,'detected_mime',v_asset.detected_mime);
end $$;

create or replace function public.admin_media_cancel_publication(p_asset_id uuid,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'reviewer_required' using errcode='42501'; end if;
  update public.media_assets set publication_status='ready_for_review',published_storage_path=null,approved_by=null,approved_at=null,updated_at=now() where id=p_asset_id and publication_status='publishing';
  update public.media_rights_assertions set review_status='pending',reviewed_by=null,reviewed_at=null,review_note=left(p_reason,500) where asset_id=p_asset_id and review_status='accepted' and reviewed_by=v_actor;
end $$;

create or replace function public.admin_media_finalize_publication(p_asset_id uuid,p_public_url text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_asset public.media_assets%rowtype; v_link public.media_asset_links%rowtype; v_rights public.media_rights_assertions%rowtype; v_media_id uuid;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'reviewer_required' using errcode='42501'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.publication_status<>'publishing' or v_asset.approved_by<>v_actor then raise exception 'publication_not_prepared'; end if;
  if p_public_url !~ '^https://[^/]+/storage/v1/object/public/public-media/' then raise exception 'invalid_public_url'; end if;
  if not exists(select 1 from storage.objects where bucket_id='public-media' and name=v_asset.published_storage_path) then raise exception 'published_object_missing'; end if;
  select * into v_link from public.media_asset_links where asset_id=p_asset_id and link_status='pending' order by linked_at limit 1 for update;
  if not found then raise exception 'media_link_missing'; end if;
  select * into v_rights from public.media_rights_assertions where asset_id=p_asset_id and review_status='accepted' order by reviewed_at desc limit 1;
  update public.media_assets set publication_status='published',published_at=now(),updated_at=now() where id=p_asset_id;
  update public.media_asset_links set link_status='active',updated_at=now() where id=v_link.id;
  insert into public.entity_media(entity_table,entity_id,storage_path,url,alt_ar,rights_note,is_primary,sort_order,created_by)
  values(v_link.entity_type,v_link.entity_id,v_asset.published_storage_path,p_public_url,v_link.alt_ar,concat(v_rights.rights_basis,': ',v_rights.copyright_owner),v_link.is_primary,v_link.sort_order,v_link.linked_by)
  returning id into v_media_id;
  insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report)
  values(p_asset_id,'publication_finalized','PUBLISHING','PUBLISHED',v_actor,'phase3-v1',gen_random_uuid(),jsonb_build_object('entity_media_id',v_media_id));
  return jsonb_build_object('asset_id',p_asset_id,'publication_status','published','entity_media_id',v_media_id,'url',p_public_url);
end $$;

create or replace function public.admin_media_open_legal_case(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_case uuid:=gen_random_uuid(); v_asset uuid:=nullif(p_payload->>'asset_id','')::uuid; v_ref text;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if not exists(select 1 from public.media_assets where id=v_asset) then raise exception 'asset_not_found'; end if;
  insert into public.media_legal_cases(id,notice_type,claimant_name,claimant_email,claimant_authority,claimed_work,complaint_text,jurisdiction,evidence,good_faith_statement,accuracy_statement,electronic_signature,submitted_by,due_at)
  values(v_case,p_payload->>'notice_type',trim(p_payload->>'claimant_name'),lower(trim(p_payload->>'claimant_email')),trim(p_payload->>'claimant_authority'),trim(p_payload->>'claimed_work'),trim(p_payload->>'complaint_text'),nullif(trim(p_payload->>'jurisdiction'),''),coalesce(p_payload->'evidence','[]'::jsonb),coalesce((p_payload->>'good_faith_statement')::boolean,false),coalesce((p_payload->>'accuracy_statement')::boolean,false),trim(p_payload->>'electronic_signature'),v_actor,now()+interval '1 day') returning public_reference into v_ref;
  insert into public.media_legal_case_assets(case_id,asset_id) values(v_case,v_asset);
  insert into public.media_legal_case_events(case_id,event_type,next_status,actor_user_id,note) values(v_case,'notice_received','received',v_actor,'Notice recorded; asset preserved under legal hold.');
  update public.media_assets set legal_hold=true,updated_at=now() where id=v_asset;
  return jsonb_build_object('case_id',v_case,'public_reference',v_ref,'status','received');
end $$;

-- Private raw and sanitized buckets. The public bucket accepts only approved vault paths.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('media-quarantine','media-quarantine',false,20971520,array['image/jpeg','image/png','image/webp','image/avif','application/pdf']),
('media-derivatives','media-derivatives',false,12582912,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists media_quarantine_intent_insert on storage.objects;
create policy media_quarantine_intent_insert on storage.objects for insert to authenticated with check (
  bucket_id='media-quarantine' and exists(select 1 from public.media_upload_intents i where i.quarantine_path=name and i.uploaded_by=(select auth.uid()) and i.status='created' and i.expires_at>now())
);
drop policy if exists media_quarantine_staff_select on storage.objects;
create policy media_quarantine_staff_select on storage.objects for select to authenticated using (bucket_id='media-quarantine' and (select private.is_staff()));
drop policy if exists media_derivatives_intent_insert on storage.objects;
create policy media_derivatives_intent_insert on storage.objects for insert to authenticated with check (
  bucket_id='media-derivatives' and (select private.is_staff()) and exists(select 1 from public.media_upload_intents i where i.uploaded_by=(select auth.uid()) and i.status='created' and name like ('sanitized/'||i.id::text||'/%'))
);
drop policy if exists media_derivatives_staff_select on storage.objects;
create policy media_derivatives_staff_select on storage.objects for select to authenticated using (bucket_id='media-derivatives' and (select private.is_staff()));

drop policy if exists public_media_staff_insert on storage.objects;
drop policy if exists public_media_staff_update on storage.objects;
drop policy if exists public_media_staff_delete on storage.objects;
drop policy if exists public_media_vault_insert on storage.objects;
create policy public_media_vault_insert on storage.objects for insert to authenticated with check (
  bucket_id='public-media' and name like 'vault/%' and exists(select 1 from public.media_assets a where a.published_storage_path=name and a.publication_status='publishing' and a.approved_by=(select auth.uid()) and not a.legal_hold)
);

alter table public.media_upload_intents enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_links enable row level security;
alter table public.media_rights_assertions enable row level security;
alter table public.media_ingestion_events enable row level security;
alter table public.media_legal_cases enable row level security;
alter table public.media_legal_case_assets enable row level security;
alter table public.media_legal_case_events enable row level security;

grant select,insert,update on public.media_upload_intents to authenticated;
grant select,insert,update on public.media_assets to authenticated;
grant select,insert,update on public.media_asset_links to authenticated;
grant select,insert,update on public.media_rights_assertions to authenticated;
grant select,insert on public.media_ingestion_events to authenticated;
grant select,insert,update on public.media_legal_cases to authenticated;
grant select,insert,update on public.media_legal_case_assets to authenticated;
grant select,insert on public.media_legal_case_events to authenticated;

create policy media_upload_intents_staff_all on public.media_upload_intents for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_assets_staff_all on public.media_assets for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_asset_links_staff_all on public.media_asset_links for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_rights_assertions_staff_all on public.media_rights_assertions for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_ingestion_events_staff_select on public.media_ingestion_events for select to authenticated using ((select private.is_staff()));
create policy media_ingestion_events_staff_insert on public.media_ingestion_events for insert to authenticated with check ((select private.is_staff()));
create policy media_legal_cases_staff_all on public.media_legal_cases for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_legal_case_assets_staff_all on public.media_legal_case_assets for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy media_legal_case_events_staff_select on public.media_legal_case_events for select to authenticated using ((select private.is_staff()));
create policy media_legal_case_events_staff_insert on public.media_legal_case_events for insert to authenticated with check ((select private.is_staff()));

create trigger set_media_upload_intents_updated_at before update on public.media_upload_intents for each row execute function private.set_updated_at();
create trigger set_media_assets_updated_at before update on public.media_assets for each row execute function private.set_updated_at();
create trigger set_media_asset_links_updated_at before update on public.media_asset_links for each row execute function private.set_updated_at();
create trigger set_media_legal_cases_updated_at before update on public.media_legal_cases for each row execute function private.set_updated_at();

revoke all on function public.admin_media_begin_ingestion(jsonb) from public,anon;
revoke all on function public.admin_media_complete_validation(uuid,jsonb) from public,anon;
revoke all on function public.admin_media_prepare_publication(uuid) from public,anon;
revoke all on function public.admin_media_cancel_publication(uuid,text) from public,anon;
revoke all on function public.admin_media_finalize_publication(uuid,text) from public,anon;
revoke all on function public.admin_media_open_legal_case(jsonb) from public,anon;
grant execute on function public.admin_media_begin_ingestion(jsonb) to authenticated;
grant execute on function public.admin_media_complete_validation(uuid,jsonb) to authenticated;
grant execute on function public.admin_media_prepare_publication(uuid) to authenticated;
grant execute on function public.admin_media_cancel_publication(uuid,text) to authenticated;
grant execute on function public.admin_media_finalize_publication(uuid,text) to authenticated;
grant execute on function public.admin_media_open_legal_case(jsonb) to authenticated;

comment on table public.media_assets is 'Governed DAM assets; raw originals remain private and publication requires technical and rights approval.';
comment on table public.media_ingestion_events is 'Append-only evidence for Media Vault state transitions.';
comment on table public.media_legal_cases is 'Notice-and-takedown case foundation; legal_hold prevents destructive cleanup.';

commit;

