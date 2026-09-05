-- Coffee Platform V1 — Unified Asset Review & Audit Console.
-- Guarantees a review path for pending assets and an append-only administrative trail.
begin;

create or replace function private.ensure_media_asset_traceability()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if not exists (select 1 from public.media_ingestion_events e where e.asset_id=new.id) then
    insert into public.media_ingestion_events(
      asset_id,event_type,previous_state,next_state,service_actor,policy_version,correlation_id,technical_report
    ) values (
      new.id,'asset_registered',null,upper(coalesce(new.technical_status,'validating')),
      'media_asset_traceability_trigger','media-review-v1',gen_random_uuid(),
      jsonb_build_object('source','media_assets_after_insert','publication_status',new.publication_status)
    );
  end if;
  return new;
end $$;

revoke all on function private.ensure_media_asset_traceability() from public,anon,authenticated;

drop trigger if exists ensure_media_asset_traceability on public.media_assets;
create trigger ensure_media_asset_traceability
  after insert on public.media_assets
  for each row execute function private.ensure_media_asset_traceability();

insert into public.media_ingestion_events(
  asset_id,event_type,previous_state,next_state,service_actor,policy_version,correlation_id,technical_report
)
select a.id,'traceability_backfill',null,upper(a.technical_status),'migration_045','media-review-v1',gen_random_uuid(),
       jsonb_build_object('source','migration_045','publication_status',a.publication_status)
from public.media_assets a
where not exists(select 1 from public.media_ingestion_events e where e.asset_id=a.id);

create or replace function public.admin_media_review_pending_asset(
  p_asset_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_role text;
  v_asset public.media_assets%rowtype;
  v_lifecycle text;
  v_entity_type text:=trim(coalesce(p_payload->>'entity_type',''));
  v_entity_id uuid;
  v_link_role text:=trim(coalesce(p_payload->>'role',''));
  v_alt_ar text:=trim(coalesce(p_payload->>'alt_ar',''));
  v_reason text:=trim(coalesce(p_payload->>'reason',''));
  v_link_id uuid;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'reviewer_required' using errcode='42501';
  end if;
  select role::text into v_role from public.profiles where id=v_actor and is_active;
  if v_role not in ('verifier','admin') then raise exception 'reviewer_required' using errcode='42501'; end if;

  select * into v_asset from public.media_assets where id=p_asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  select lifecycle_state into v_lifecycle from public.media_asset_lifecycle where asset_id=p_asset_id;
  if coalesce(v_lifecycle,'') not in ('pending_technical_audit','pending_approval') then raise exception 'asset_not_pending_review'; end if;

  if p_action='approve_assign' then
    if v_asset.sha256_hex is null or v_asset.detected_mime is null or v_asset.byte_size is null or v_asset.byte_size<=0 then
      raise exception 'technical_evidence_incomplete';
    end if;
    if v_asset.detected_mime<>'application/pdf' and (v_asset.width is null or v_asset.height is null) then
      raise exception 'technical_evidence_incomplete';
    end if;
    if exists(
      select 1 from public.media_assets other
      where other.id<>v_asset.id and other.sha256_hex=v_asset.sha256_hex
        and other.technical_status='passed' and other.duplicate_of_asset_id is null
    ) then raise exception 'duplicate_requires_review'; end if;
    begin v_entity_id:=(p_payload->>'entity_id')::uuid; exception when others then raise exception 'invalid_assignment'; end;
    if v_entity_type not in ('organizations','brands','products','offers','contents','origin_claims')
       or v_link_role not in ('primary','gallery','logo','hero','evidence','document')
       or length(v_alt_ar)<2 then raise exception 'invalid_assignment'; end if;
    if not private.media_target_exists(v_entity_type,v_entity_id) then raise exception 'invalid_media_target'; end if;

    update public.media_assets
    set technical_status='passed',
        rejection_codes='{}'::text[],
        validated_at=coalesce(validated_at,now()),
        publication_status=case when publication_status='private' then 'ready_for_review' else publication_status end,
        technical_report=technical_report||jsonb_build_object(
          'manual_audit_decision','approved','manual_audit_by',v_actor,'manual_audit_at',now(),
          'assigned_entity_type',v_entity_type,'assigned_entity_id',v_entity_id,'assigned_role',v_link_role
        ),
        updated_at=now()
    where id=v_asset.id;

    insert into public.media_asset_links(asset_id,entity_type,entity_id,role,is_primary,sort_order,alt_ar,link_status,linked_by)
    values(v_asset.id,v_entity_type,v_entity_id,v_link_role,false,0,v_alt_ar,'pending',v_actor)
    on conflict(asset_id,entity_type,entity_id,role) do update
      set alt_ar=excluded.alt_ar,link_status='pending',linked_by=v_actor,linked_at=now(),updated_at=now()
    returning id into v_link_id;

    insert into public.media_ingestion_events(
      asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report
    ) values (
      v_asset.id,'pending_asset_approved_and_assigned',upper(v_lifecycle),'PENDING_APPROVAL',v_actor,
      'media-review-v1',gen_random_uuid(),jsonb_build_object('entity_type',v_entity_type,'entity_id',v_entity_id,'role',v_link_role,'link_id',v_link_id)
    );
    return jsonb_build_object('asset_id',v_asset.id,'decision','approved_and_assigned','link_id',v_link_id,'lifecycle_state','pending_approval');

  elsif p_action='reject_quarantine' then
    if length(v_reason)<10 then raise exception 'quarantine_reason_required'; end if;
    if exists(select 1 from public.media_asset_links l where l.asset_id=v_asset.id and l.link_status='active')
       or exists(select 1 from public.entity_media e where e.asset_id=v_asset.id and private.media_target_is_active(e.entity_table,e.entity_id))
    then raise exception 'active_record_links_block_quarantine'; end if;

    update public.media_assets
    set technical_status='rejected',
        rejection_codes=case when 'manual_review_rejected'=any(rejection_codes) then rejection_codes else array_append(rejection_codes,'manual_review_rejected') end,
        publication_status='quarantined',restricted_at=now(),quarantine_started_at=now(),retention_expires_at=now()+interval '30 days',
        technical_report=technical_report||jsonb_build_object(
          'manual_audit_decision','rejected','manual_audit_reason',left(v_reason,1000),
          'manual_audit_by',v_actor,'manual_audit_at',now()
        ),
        updated_at=now()
    where id=v_asset.id;
    update public.media_asset_links set link_status='suppressed',updated_at=now()
      where asset_id=v_asset.id and link_status='pending';

    insert into public.media_ingestion_events(
      asset_id,event_type,previous_state,next_state,actor_user_id,policy_version,correlation_id,technical_report
    ) values (
      v_asset.id,'pending_asset_rejected_and_quarantined',upper(v_lifecycle),'QUARANTINE_RETENTION',v_actor,
      'media-review-v1',gen_random_uuid(),jsonb_build_object('reason',left(v_reason,1000),'retention_days',30)
    );
    return jsonb_build_object('asset_id',v_asset.id,'decision','rejected_and_quarantined','lifecycle_state','quarantine_retention','retention_days',30);
  end if;

  raise exception 'invalid_review_action';
end $$;

revoke all on function public.admin_media_review_pending_asset(uuid,text,jsonb) from public,anon;
grant execute on function public.admin_media_review_pending_asset(uuid,text,jsonb) to authenticated;

comment on function public.admin_media_review_pending_asset(uuid,text,jsonb) is
  'Unified verifier/admin decision service for pending media assets. Every decision appends an ingestion audit event.';

commit;
