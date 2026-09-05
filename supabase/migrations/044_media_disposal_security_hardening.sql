-- Coffee Platform V1 — harden the final disposal boundary after advisor review.
-- The exposed RPC remains SECURITY INVOKER; privileged deletes run only in a
-- non-executable internal trigger after the RPC has validated the admin action.
begin;

create index if not exists media_asset_disposal_audit_disposed_by_idx
  on public.media_asset_disposal_audit(disposed_by);

create or replace function private.finalize_media_purge_trigger()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_asset public.media_assets%rowtype; v_relations jsonb;
begin
  if old.status<>'executing' or new.status<>'executed' then return new; end if;
  if auth.uid() is null or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if coalesce((new.execution_result->>'complete')::boolean,false) is not true then raise exception 'storage_purge_incomplete'; end if;
  select * into v_asset from public.media_assets where id=new.asset_id for update;
  if not found then raise exception 'asset_not_found'; end if;
  if v_asset.legal_hold or v_asset.publication_status<>'quarantined' or v_asset.retention_expires_at is null or v_asset.retention_expires_at>now()
    or exists(select 1 from public.entity_media where asset_id=v_asset.id)
    or exists(select 1 from public.media_asset_links where asset_id=v_asset.id and link_status in ('pending','active'))
  then raise exception 'asset_no_longer_disposal_eligible'; end if;
  if exists(select 1 from public.media_assets where duplicate_of_asset_id=v_asset.id) then raise exception 'dependent_duplicates_block_purge'; end if;

  select jsonb_build_object(
    'links',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_asset_links x where x.asset_id=v_asset.id),'[]'::jsonb),
    'rights',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_rights_assertions x where x.asset_id=v_asset.id),'[]'::jsonb),
    'events',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_ingestion_events x where x.asset_id=v_asset.id),'[]'::jsonb),
    'entity_media',coalesce((select jsonb_agg(to_jsonb(x)) from public.entity_media x where x.asset_id=v_asset.id),'[]'::jsonb),
    'legal_cases',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_legal_case_assets x where x.asset_id=v_asset.id),'[]'::jsonb),
    'purge_requests',coalesce((select jsonb_agg(to_jsonb(x)) from public.media_purge_requests x where x.asset_id=v_asset.id),'[]'::jsonb)
  ) into v_relations;
  insert into public.media_asset_disposal_audit(asset_id,purge_request_id,asset_snapshot,relations_snapshot,storage_result,disposed_by)
  values(v_asset.id,new.id,to_jsonb(v_asset),v_relations,new.execution_result,auth.uid());
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(auth.uid(),'permanent_media_asset_purge','media_assets',v_asset.id::text,to_jsonb(v_asset),jsonb_build_object('purge_request_id',new.id,'storage_result',new.execution_result),'media_lifecycle_v1');
  delete from public.media_legal_case_assets where asset_id=v_asset.id;
  delete from public.media_ingestion_events where asset_id=v_asset.id or upload_intent_id=v_asset.id;
  delete from public.media_rights_assertions where asset_id=v_asset.id;
  delete from public.media_asset_links where asset_id=v_asset.id;
  delete from public.entity_media where asset_id=v_asset.id;
  delete from public.media_purge_requests where asset_id=v_asset.id;
  delete from public.media_assets where id=v_asset.id;
  delete from public.media_upload_intents where id=v_asset.id;
  return new;
end $$;
revoke all on function private.finalize_media_purge_trigger() from public,anon,authenticated;

drop trigger if exists finalize_media_purge_after_execution on public.media_purge_requests;
create trigger finalize_media_purge_after_execution
after update of status on public.media_purge_requests
for each row when (old.status='executing' and new.status='executed')
execute function private.finalize_media_purge_trigger();

create or replace function public.admin_media_finalize_purge(p_request_id uuid,p_storage_result jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_request public.media_purge_requests%rowtype; v_asset_id uuid;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  select * into v_request from public.media_purge_requests where id=p_request_id for update;
  if not found or v_request.status<>'executing' then raise exception 'purge_not_executing'; end if;
  if coalesce((p_storage_result->>'complete')::boolean,false) is not true then raise exception 'storage_purge_incomplete'; end if;
  v_asset_id:=v_request.asset_id;
  update public.media_purge_requests set status='executed',executed_at=now(),execution_result=p_storage_result where id=p_request_id;
  return jsonb_build_object('purged',true,'asset_id',v_asset_id,'audit_retained',true);
end $$;
revoke all on function public.admin_media_finalize_purge(uuid,jsonb) from public,anon;
grant execute on function public.admin_media_finalize_purge(uuid,jsonb) to authenticated;

comment on function private.finalize_media_purge_trigger() is 'Internal-only disposal executor. It is reachable solely through an approved executing request transition and preserves an immutable tombstone.';
commit;
