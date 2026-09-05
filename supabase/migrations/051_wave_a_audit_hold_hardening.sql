-- Wave A / Phase 4 hardening — internal audit mirrors + governed hold writes
begin;

-- Internal trigger functions require write authority while remaining non-callable APIs.
create or replace function private.mirror_audit_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,before_data,after_data,metadata,policy_version)
  values(new.action,new.entity_table,new.entity_id,new.actor_user_id,'audit_events',new.id::text,new.source,new.created_at,new.before_data,new.after_data,'{}'::jsonb,'ea-baseline-v1')
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_audit_event() from public,anon,authenticated;

create or replace function private.mirror_media_ingestion_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,service_actor,source_relation,source_event_id,source_system,occurred_at,metadata,correlation_id,policy_version)
  values(new.event_type,'media_asset',coalesce(new.asset_id::text,new.upload_intent_id::text,'unknown'),new.actor_user_id,new.service_actor,'media_ingestion_events',new.id::text,'media_vault',new.created_at,
         jsonb_build_object('previous_state',new.previous_state,'next_state',new.next_state,'technical_report',new.technical_report),new.correlation_id,new.policy_version)
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_media_ingestion_event() from public,anon,authenticated;

create or replace function private.mirror_disposal_audit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values('asset_disposed','media_asset',new.asset_id::text,new.disposed_by,'media_asset_disposal_audit',new.id::text,'media_vault',new.disposed_at,
         jsonb_build_object('purge_request_id',new.purge_request_id,'asset_snapshot',new.asset_snapshot,'relations_snapshot',new.relations_snapshot,'storage_result',new.storage_result),new.policy_version)
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_disposal_audit() from public,anon,authenticated;

drop trigger if exists immutable_governed_audit_log on public.governed_audit_log;
create trigger immutable_governed_audit_log before update or delete on public.governed_audit_log
for each row execute function private.block_audit_mutation();

-- Legal holds may be written only by verifier/admin and are always audited by trigger.
grant insert,update on public.governed_legal_holds to authenticated;
drop policy if exists governed_legal_holds_verifier_insert on public.governed_legal_holds;
create policy governed_legal_holds_verifier_insert on public.governed_legal_holds for insert to authenticated
with check ((select private.is_staff(array['verifier','admin']::public.staff_role[])) and placed_by=(select auth.uid()) and status='active');
drop policy if exists governed_legal_holds_verifier_update on public.governed_legal_holds;
create policy governed_legal_holds_verifier_update on public.governed_legal_holds for update to authenticated
using ((select private.is_staff(array['verifier','admin']::public.staff_role[])))
with check ((select private.is_staff(array['verifier','admin']::public.staff_role[])) and status in ('active','released'));

create or replace function private.audit_governed_legal_hold()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_action text; v_actor uuid;
begin
  if tg_op='INSERT' then
    v_action:='legal_hold_placed'; v_actor:=new.placed_by;
  elsif old.status='active' and new.status='released' then
    v_action:='legal_hold_released'; v_actor:=new.released_by;
  else
    raise exception 'invalid_legal_hold_mutation' using errcode='55000';
  end if;
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values(v_action,new.object_type,new.object_id::text,v_actor,'governed_legal_holds',new.id::text||':'||v_action,'governance_kernel',now(),
         jsonb_build_object('reason',case when v_action='legal_hold_placed' then new.reason else new.release_reason end),'ea-baseline-v1')
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.audit_governed_legal_hold() from public,anon,authenticated;

drop trigger if exists governed_legal_hold_audit on public.governed_legal_holds;
create trigger governed_legal_hold_audit after insert or update on public.governed_legal_holds
for each row execute function private.audit_governed_legal_hold();

create or replace function public.admin_set_governed_legal_hold(p_object_type text,p_object_id uuid,p_action text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_hold public.governed_legal_holds;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'verifier_required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'hold_reason_required'; end if;
  if not exists(select 1 from public.governed_object_envelope e where e.object_type=p_object_type and e.object_id=p_object_id) then raise exception 'governed_object_not_found'; end if;
  if p_action='place' then
    insert into public.governed_legal_holds(object_type,object_id,status,reason,placed_by) values(p_object_type,p_object_id,'active',trim(p_reason),v_actor)
    returning * into v_hold;
  elsif p_action='release' then
    update public.governed_legal_holds set status='released',released_by=v_actor,released_at=now(),release_reason=trim(p_reason)
    where object_type=p_object_type and object_id=p_object_id and status='active' returning * into v_hold;
    if v_hold.id is null then raise exception 'active_hold_not_found'; end if;
  else raise exception 'invalid_hold_action'; end if;
  return jsonb_build_object('ok',true,'hold_id',v_hold.id,'status',v_hold.status);
end $$;
revoke all on function public.admin_set_governed_legal_hold(text,uuid,text,text) from public,anon;
grant execute on function public.admin_set_governed_legal_hold(text,uuid,text,text) to authenticated;

commit;
