-- Coffee Platform V1 — governed reconciliation for legacy Media Vault assets.
-- Reads preserved public-media originals, authorizes a short-lived derivative upload,
-- and records the real byte-level validation result without inventing rights evidence.
begin;

create or replace function public.admin_media_begin_legacy_reconciliation(p_asset_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_asset public.media_assets%rowtype;
  v_correlation uuid := gen_random_uuid();
  v_prefix text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if v_role not in ('verifier','admin') then
    raise exception 'reviewer_required' using errcode='42501';
  end if;

  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  if v_asset.technical_report->>'migration' <> '038_phase3_legacy_entity_media_backfill' then
    raise exception 'legacy_asset_required';
  end if;
  if v_asset.technical_status <> 'validating' then
    raise exception 'asset_already_reconciled';
  end if;
  if not exists(
    select 1 from storage.objects
    where bucket_id='public-media' and name=v_asset.original_storage_path
  ) then
    raise exception 'legacy_object_missing';
  end if;

  v_prefix := 'legacy-sanitized/'||v_asset.id::text||'/'||v_correlation::text||'/';
  update public.media_assets
  set technical_report=(technical_report - 'legacy_reconciliation_started_by' - 'legacy_reconciliation_started_at' - 'legacy_reconciliation_correlation_id' - 'legacy_reconciliation_prefix') || jsonb_build_object(
        'legacy_reconciliation_started_by',v_actor,
        'legacy_reconciliation_started_at',now(),
        'legacy_reconciliation_correlation_id',v_correlation,
        'legacy_reconciliation_prefix',v_prefix
      ),
      updated_at=now()
  where id=v_asset.id;

  return jsonb_build_object(
    'asset_id',v_asset.id,
    'correlation_id',v_correlation,
    'derivative_prefix',v_prefix,
    'original_storage_path',v_asset.original_storage_path,
    'purpose',v_asset.purpose,
    'declared_mime',v_asset.declared_mime
  );
end $$;

create or replace function public.admin_media_complete_legacy_reconciliation(p_asset_id uuid,p_report jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_asset public.media_assets%rowtype;
  v_passed boolean := coalesce((p_report->>'passed')::boolean,false);
  v_sha text := lower(coalesce(p_report->>'sha256_hex',''));
  v_detected text := nullif(p_report->>'detected_mime','');
  v_sanitized text := nullif(p_report->>'sanitized_storage_path','');
  v_correlation uuid := nullif(p_report->>'correlation_id','')::uuid;
  v_duplicate uuid;
  v_status text;
  v_publication text;
  v_rejections text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_report->'rejection_codes','[]'::jsonb))),'{}');
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if v_role not in ('verifier','admin') then
    raise exception 'reviewer_required' using errcode='42501';
  end if;

  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  if v_asset.technical_report->>'migration' <> '038_phase3_legacy_entity_media_backfill' then
    raise exception 'legacy_asset_required';
  end if;
  if v_asset.technical_status <> 'validating' then raise exception 'asset_already_reconciled'; end if;
  if v_asset.technical_report->>'legacy_reconciliation_started_by' <> v_actor::text
     or v_asset.technical_report->>'legacy_reconciliation_correlation_id' <> v_correlation::text then
    raise exception 'legacy_reconciliation_not_started';
  end if;
  if v_detected not in ('image/jpeg','image/png','image/webp','image/avif','application/pdf') then
    raise exception 'invalid_detected_mime';
  end if;
  if v_sha !~ '^[0-9a-f]{64}$' then raise exception 'checksum_required'; end if;
  if nullif(p_report->>'byte_size','')::bigint is null or (p_report->>'byte_size')::bigint < 1 then
    raise exception 'byte_size_required';
  end if;
  if v_detected <> 'application/pdf' and (
    nullif(p_report->>'width','')::integer is null or nullif(p_report->>'height','')::integer is null
  ) then
    raise exception 'dimensions_required';
  end if;

  if v_passed then
    select id into v_duplicate
    from public.media_assets
    where id<>v_asset.id and sha256_hex=v_sha and technical_status='passed' and duplicate_of_asset_id is null
    order by validated_at,id limit 1;
  end if;

  if v_passed and v_duplicate is null then
    if v_sanitized is null or v_sanitized not like (v_asset.technical_report->>'legacy_reconciliation_prefix')||'%' then
      raise exception 'sanitized_path_required';
    end if;
    if not exists(select 1 from storage.objects where bucket_id='media-derivatives' and name=v_sanitized) then
      raise exception 'sanitized_object_missing';
    end if;
  else
    v_sanitized := null;
  end if;

  v_status := case when not v_passed then 'rejected' when v_duplicate is not null then 'duplicate' else 'passed' end;
  v_publication := case when not v_passed then 'rejected' else v_asset.publication_status end;

  update public.media_assets
  set detected_mime=v_detected,
      byte_size=(p_report->>'byte_size')::bigint,
      width=nullif(p_report->>'width','')::integer,
      height=nullif(p_report->>'height','')::integer,
      page_count=nullif(p_report->>'page_count','')::integer,
      sha256_hex=v_sha,
      duplicate_of_asset_id=v_duplicate,
      technical_status=v_status,
      publication_status=v_publication,
      sanitized_storage_path=v_sanitized,
      rejection_codes=v_rejections,
      technical_report=(technical_report - 'legacy_reconciliation_started_by' - 'legacy_reconciliation_started_at' - 'legacy_reconciliation_correlation_id' - 'legacy_reconciliation_prefix') || p_report || jsonb_build_object(
        'legacy_reconciliation_completed_by',v_actor,
        'legacy_reconciliation_completed_at',now(),
        'legacy_reconciliation_version','phase4-legacy-v1',
        'rights_assertion_created',false,
        'rights_note','Technical reconciliation never manufactures legal rights evidence.'
      ),
      validated_at=now(),
      updated_at=now()
  where id=v_asset.id;

  insert into public.media_ingestion_events(
    asset_id,event_type,previous_state,next_state,actor_user_id,
    service_actor,policy_version,correlation_id,technical_report
  ) values (
    v_asset.id,'legacy_technical_reconciliation','VALIDATING',upper(v_status),v_actor,
    'render-legacy-media-reconciler','phase4-legacy-v1',v_correlation,p_report
  );

  return jsonb_build_object(
    'asset_id',v_asset.id,
    'technical_status',v_status,
    'publication_status',v_publication,
    'duplicate_of_asset_id',v_duplicate,
    'rejection_codes',to_jsonb(v_rejections)
  );
end $$;

create or replace function public.admin_media_fail_legacy_reconciliation(p_asset_id uuid,p_reason text)
returns void
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_asset public.media_assets%rowtype;
  v_correlation uuid;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if v_role not in ('verifier','admin') then raise exception 'reviewer_required' using errcode='42501'; end if;
  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found or v_asset.technical_status<>'validating' then return; end if;
  if v_asset.technical_report->>'legacy_reconciliation_started_by' <> v_actor::text then return; end if;
  v_correlation := nullif(v_asset.technical_report->>'legacy_reconciliation_correlation_id','')::uuid;
  update public.media_assets
  set technical_report=(technical_report - 'legacy_reconciliation_started_by' - 'legacy_reconciliation_started_at' - 'legacy_reconciliation_correlation_id' - 'legacy_reconciliation_prefix') || jsonb_build_object(
        'legacy_reconciliation_last_error',left(coalesce(p_reason,'unknown_error'),500),
        'legacy_reconciliation_failed_at',now()
      ),
      updated_at=now()
  where id=v_asset.id;
  insert into public.media_ingestion_events(asset_id,event_type,previous_state,next_state,actor_user_id,service_actor,policy_version,correlation_id,technical_report)
  values(v_asset.id,'legacy_technical_reconciliation_failed','VALIDATING','VALIDATING',v_actor,'render-legacy-media-reconciler','phase4-legacy-v1',coalesce(v_correlation,gen_random_uuid()),jsonb_build_object('reason',left(coalesce(p_reason,'unknown_error'),500)));
end $$;

drop policy if exists media_derivatives_legacy_reconciliation_insert on storage.objects;
create policy media_derivatives_legacy_reconciliation_insert on storage.objects
for insert to authenticated
with check (
  bucket_id='media-derivatives' and (select private.is_staff()) and exists(
    select 1 from public.media_assets a
    where a.technical_status='validating'
      and a.technical_report->>'migration'='038_phase3_legacy_entity_media_backfill'
      and a.technical_report->>'legacy_reconciliation_started_by'=(select auth.uid())::text
      and name like (a.technical_report->>'legacy_reconciliation_prefix')||'%'
  )
);

drop policy if exists media_derivatives_legacy_reconciliation_delete on storage.objects;
create policy media_derivatives_legacy_reconciliation_delete on storage.objects
for delete to authenticated
using (
  bucket_id='media-derivatives' and (select private.is_staff()) and exists(
    select 1 from public.media_assets a
    where a.technical_status='validating'
      and a.technical_report->>'legacy_reconciliation_started_by'=(select auth.uid())::text
      and name like (a.technical_report->>'legacy_reconciliation_prefix')||'%'
  )
);

revoke all on function public.admin_media_begin_legacy_reconciliation(uuid) from public,anon;
revoke all on function public.admin_media_complete_legacy_reconciliation(uuid,jsonb) from public,anon;
revoke all on function public.admin_media_fail_legacy_reconciliation(uuid,text) from public,anon;
grant execute on function public.admin_media_begin_legacy_reconciliation(uuid) to authenticated;
grant execute on function public.admin_media_complete_legacy_reconciliation(uuid,jsonb) to authenticated;
grant execute on function public.admin_media_fail_legacy_reconciliation(uuid,text) to authenticated;

comment on function public.admin_media_complete_legacy_reconciliation(uuid,jsonb) is
  'Finalizes byte-level validation of Migration 038 assets and appends immutable evidence; does not infer legal rights.';

commit;
