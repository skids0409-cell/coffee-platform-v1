-- Atomic closed-beta feedback lifecycle boundary.
-- Feedback state mutation and audit evidence commit or fail together.
begin;

create or replace function public.admin_transition_beta_feedback(
  p_feedback_id uuid,
  p_next_status text
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
  v_current text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;

  if p_next_status not in ('triaged','resolved','duplicate') then
    raise exception 'invalid_beta_feedback_status' using errcode='22023';
  end if;

  select to_jsonb(f), f.status
    into v_before, v_current
  from public.beta_feedback f
  where f.id = p_feedback_id
  for update;

  if v_before is null then
    raise exception 'beta_feedback_not_found' using errcode='P0002';
  end if;

  if v_current = p_next_status then
    raise exception 'beta_feedback_state_unchanged' using errcode='22023';
  end if;

  if not (
    (v_current = 'new' and p_next_status in ('triaged','duplicate')) or
    (v_current = 'triaged' and p_next_status in ('resolved','duplicate')) or
    (v_current = 'in_progress' and p_next_status in ('resolved','duplicate'))
  ) then
    raise exception 'illegal_beta_feedback_transition:%->%', v_current, p_next_status using errcode='23514';
  end if;

  update public.beta_feedback
  set status = p_next_status,
      updated_at = now()
  where id = p_feedback_id;

  select to_jsonb(f) into v_after
  from public.beta_feedback f
  where f.id = p_feedback_id;

  insert into public.audit_events(
    actor_user_id,
    action,
    entity_table,
    entity_id,
    before_data,
    after_data,
    source
  ) values (
    v_actor,
    'process_beta_feedback_' || p_next_status,
    'beta_feedback',
    p_feedback_id::text,
    v_before,
    v_after,
    'beta_feedback_atomic_transition_v1'
  );

  return jsonb_build_object(
    'updated', true,
    'id', p_feedback_id,
    'status', p_next_status,
    'record', v_after
  );
end $$;

revoke all on function public.admin_transition_beta_feedback(uuid,text) from public,anon;
grant execute on function public.admin_transition_beta_feedback(uuid,text) to authenticated;

commit;
