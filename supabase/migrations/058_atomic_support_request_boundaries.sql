-- Atomic Support Desk mutation boundaries.
-- Each state/event mutation and its canonical audit evidence succeed or fail together.
begin;

create or replace function public.admin_update_support_request(
  p_request_id uuid,
  p_status text,
  p_priority text,
  p_assigned_to uuid default null,
  p_internal_notes text default null,
  p_resolution_note text default null,
  p_technical_reference text default null
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_existing_resolved_at timestamptz;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_status not in ('new','triaged','in_progress','waiting_user','resolved','closed','spam','archived') then
    raise exception 'invalid_support_status' using errcode='22023';
  end if;
  if p_priority not in ('low','normal','high','urgent') then
    raise exception 'invalid_support_priority' using errcode='22023';
  end if;

  select to_jsonb(s), s.resolved_at
    into v_before, v_existing_resolved_at
  from public.support_requests s
  where s.id=p_request_id
  for update;
  if v_before is null then raise exception 'support_request_not_found' using errcode='P0002'; end if;

  update public.support_requests
  set status=p_status,
      priority=p_priority,
      assigned_to=p_assigned_to,
      internal_notes=nullif(btrim(coalesce(p_internal_notes,'')),''),
      resolution_note=nullif(btrim(coalesce(p_resolution_note,'')),''),
      technical_reference=nullif(btrim(coalesce(p_technical_reference,'')),''),
      resolved_at=case when p_status in ('resolved','closed','archived') then coalesce(v_existing_resolved_at,now()) else null end,
      archived_at=case when p_status='archived' then now() else null end
  where id=p_request_id;

  select to_jsonb(s) into v_after from public.support_requests s where s.id=p_request_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'process_support_request','support_requests',p_request_id::text,v_before,v_after,'support_atomic_update_v1');

  return jsonb_build_object('updated',true,'id',p_request_id,'record',v_after);
end $$;

create or replace function public.admin_mark_support_event(
  p_request_id uuid,
  p_event text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_phone text;
  v_resolution text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_event not in ('escalated','reply') then
    raise exception 'invalid_support_event' using errcode='22023';
  end if;

  select to_jsonb(s), s.requester_phone, s.resolution_note
    into v_before, v_phone, v_resolution
  from public.support_requests s
  where s.id=p_request_id
  for update;
  if v_before is null then raise exception 'support_request_not_found' using errcode='P0002'; end if;

  if p_event='reply' and (nullif(btrim(coalesce(v_phone,'')),'') is null or length(btrim(coalesce(v_resolution,''))) < 3) then
    raise exception 'contact_or_resolution_missing' using errcode='23514';
  end if;

  if p_event='escalated' then
    update public.support_requests set escalated_at=now() where id=p_request_id;
  else
    update public.support_requests set customer_replied_at=now() where id=p_request_id;
  end if;

  select to_jsonb(s) into v_after from public.support_requests s where s.id=p_request_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,case when p_event='escalated' then 'mark_support_escalated' else 'mark_support_reply' end,'support_requests',p_request_id::text,v_before,v_after,'support_atomic_event_v1');

  return jsonb_build_object('updated',true,'id',p_request_id,'event',p_event,'record',v_after);
end $$;

create or replace function public.admin_delete_archived_support_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_status text;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;

  select to_jsonb(s), s.status into v_before,v_status
  from public.support_requests s
  where s.id=p_request_id
  for update;
  if v_before is null then raise exception 'support_request_not_found' using errcode='P0002'; end if;
  if v_status <> 'archived' then raise exception 'archived_request_required' using errcode='23514'; end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'delete_archived_support_request','support_requests',p_request_id::text,v_before,jsonb_build_object('deleted',true),'support_atomic_delete_v1');

  delete from public.support_requests where id=p_request_id;
  return jsonb_build_object('updated',true,'id',p_request_id,'deleted',true);
end $$;

revoke all on function public.admin_update_support_request(uuid,text,text,uuid,text,text,text) from public,anon;
revoke all on function public.admin_mark_support_event(uuid,text) from public,anon;
revoke all on function public.admin_delete_archived_support_request(uuid) from public,anon;
grant execute on function public.admin_update_support_request(uuid,text,text,uuid,text,text,text) to authenticated;
grant execute on function public.admin_mark_support_event(uuid,text) to authenticated;
grant execute on function public.admin_delete_archived_support_request(uuid) to authenticated;

commit;
