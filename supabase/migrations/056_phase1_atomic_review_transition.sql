-- Phase 1 wrap-up — atomic Review & Approval lifecycle transition.
-- State mutation and canonical audit evidence succeed or fail together.
begin;

create or replace function public.admin_transition_review_record(
  p_entity text,
  p_entity_id uuid,
  p_next_status public.publication_status,
  p_override_reason text default null
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
  v_current public.publication_status;
  v_reason text := nullif(btrim(coalesce(p_override_reason,'')), '');
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_entity not in ('products','brands','organizations','offers','contents','origin_claims') then
    raise exception 'unsupported_review_entity' using errcode='22023';
  end if;
  if p_next_status in ('published','rejected','archived')
     and not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;
  if v_reason is not null then
    if length(v_reason) < 10 then
      raise exception 'override_reason_too_short' using errcode='22023';
    end if;
    if not (select private.is_staff(array['admin']::public.staff_role[])) then
      raise exception 'admin_required_for_override' using errcode='42501';
    end if;
  end if;

  if p_entity='products' then
    select to_jsonb(x), x.status into v_before,v_current from public.products x where x.id=p_entity_id for update;
  elsif p_entity='brands' then
    select to_jsonb(x), x.status into v_before,v_current from public.brands x where x.id=p_entity_id for update;
  elsif p_entity='organizations' then
    select to_jsonb(x), x.status into v_before,v_current from public.organizations x where x.id=p_entity_id for update;
  elsif p_entity='offers' then
    select to_jsonb(x), x.status into v_before,v_current from public.offers x where x.id=p_entity_id for update;
  elsif p_entity='contents' then
    select to_jsonb(x), x.status into v_before,v_current from public.contents x where x.id=p_entity_id for update;
  else
    select to_jsonb(x), x.status into v_before,v_current from public.origin_claims x where x.id=p_entity_id for update;
  end if;
  if v_before is null then raise exception 'record_not_found' using errcode='P0002'; end if;
  if v_current = p_next_status then raise exception 'review_state_unchanged' using errcode='22023'; end if;

  if not (
    (v_current='draft' and p_next_status in ('in_review','rejected','archived')) or
    (v_current='in_review' and p_next_status in ('draft','published','rejected','archived')) or
    (v_current='rejected' and p_next_status in ('draft','archived')) or
    (v_current='published' and p_next_status='archived') or
    (v_current='archived' and p_next_status='draft')
  ) then
    raise exception 'illegal_review_transition:%->%',v_current,p_next_status using errcode='23514';
  end if;

  if p_entity='products' then update public.products set status=p_next_status where id=p_entity_id;
  elsif p_entity='brands' then update public.brands set status=p_next_status where id=p_entity_id;
  elsif p_entity='organizations' then update public.organizations set status=p_next_status where id=p_entity_id;
  elsif p_entity='offers' then update public.offers set status=p_next_status where id=p_entity_id;
  elsif p_entity='contents' then update public.contents set status=p_next_status where id=p_entity_id;
  else update public.origin_claims set status=p_next_status where id=p_entity_id;
  end if;

  if p_entity='products' then select to_jsonb(x) into v_after from public.products x where x.id=p_entity_id;
  elsif p_entity='brands' then select to_jsonb(x) into v_after from public.brands x where x.id=p_entity_id;
  elsif p_entity='organizations' then select to_jsonb(x) into v_after from public.organizations x where x.id=p_entity_id;
  elsif p_entity='offers' then select to_jsonb(x) into v_after from public.offers x where x.id=p_entity_id;
  elsif p_entity='contents' then select to_jsonb(x) into v_after from public.contents x where x.id=p_entity_id;
  else select to_jsonb(x) into v_after from public.origin_claims x where x.id=p_entity_id;
  end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(
    v_actor,
    case when p_next_status='published' and v_reason is not null then 'admin_publish_override' else 'admin_set_'||p_next_status::text end,
    p_entity,
    p_entity_id::text,
    v_before,
    v_after || case when v_reason is null then '{}'::jsonb else jsonb_build_object('override_reason',v_reason) end,
    'review_atomic_transition_v1'
  );

  return jsonb_build_object('updated',true,'entity',p_entity,'id',p_entity_id,'status',p_next_status,'record',v_after);
end $$;

revoke all on function public.admin_transition_review_record(text,uuid,public.publication_status,text) from public,anon;
grant execute on function public.admin_transition_review_record(text,uuid,public.publication_status,text) to authenticated;

commit;
