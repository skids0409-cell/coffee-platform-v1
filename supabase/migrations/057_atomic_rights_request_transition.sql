-- Atomic Rights Request transition boundary.
-- State mutation and canonical audit evidence succeed or fail together.
begin;

create or replace function public.admin_transition_rights_request(
  p_request_id uuid,
  p_next_status public.case_status,
  p_resolution_note text default null
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
  v_current public.case_status;
  v_note text := nullif(btrim(coalesce(p_resolution_note,'')), '');
  v_final boolean := p_next_status in ('approved','rejected','closed');
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;

  if v_final and coalesce(length(v_note),0) < 10 then
    raise exception 'resolution_note_required' using errcode='22023';
  end if;

  select to_jsonb(r), r.status
    into v_before, v_current
  from public.rights_requests r
  where r.id = p_request_id
  for update;

  if v_before is null then
    raise exception 'rights_request_not_found' using errcode='P0002';
  end if;
  if v_current = p_next_status then
    raise exception 'rights_state_unchanged' using errcode='22023';
  end if;

  if not (
    (v_current='submitted' and p_next_status in ('in_review','needs_evidence')) or
    (v_current='needs_evidence' and p_next_status='in_review') or
    (v_current='in_review' and p_next_status in ('needs_evidence','approved','rejected','closed'))
  ) then
    raise exception 'illegal_rights_transition:%->%', v_current, p_next_status using errcode='23514';
  end if;

  update public.rights_requests
  set status = p_next_status,
      resolution_note = case when v_final then v_note else null end,
      assigned_to = v_actor,
      closed_at = case when v_final then now() else null end
  where id = p_request_id;

  select to_jsonb(r) into v_after
  from public.rights_requests r
  where r.id = p_request_id;

  insert into public.audit_events(
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, source
  ) values (
    v_actor,
    'process_rights_' || p_next_status::text,
    'rights_requests',
    p_request_id::text,
    v_before,
    v_after,
    'rights_atomic_transition_v1'
  );

  return jsonb_build_object(
    'updated', true,
    'id', p_request_id,
    'status', p_next_status,
    'record', v_after
  );
end $$;

revoke all on function public.admin_transition_rights_request(uuid,public.case_status,text) from public,anon;
grant execute on function public.admin_transition_rights_request(uuid,public.case_status,text) to authenticated;

commit;
