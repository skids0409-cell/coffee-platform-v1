-- Atomic Search Governance mutation boundaries.
begin;

create or replace function public.admin_create_search_term(
  p_canonical_term_ar text,
  p_canonical_term_en text,
  p_normalized_term text,
  p_aliases text[],
  p_intent text,
  p_entity_scope text[],
  p_match_mode text,
  p_weight integer,
  p_source_basis text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_after jsonb;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if length(btrim(coalesce(p_canonical_term_ar,''))) < 2 or length(btrim(coalesce(p_normalized_term,''))) < 2 then raise exception 'invalid_search_term' using errcode='22023'; end if;
  if p_intent not in ('broad','product','organization','content','origin') then raise exception 'invalid_search_intent' using errcode='22023'; end if;
  if coalesce(cardinality(p_entity_scope),0) < 1 or not (p_entity_scope <@ array['product','origin','content','organization']::text[]) then raise exception 'invalid_search_scope' using errcode='22023'; end if;
  if p_match_mode not in ('exact','prefix','contains') then raise exception 'invalid_match_mode' using errcode='22023'; end if;
  if p_source_basis not in ('platform_decision','industry_reference','observed_query') then raise exception 'invalid_source_basis' using errcode='22023'; end if;
  if p_weight < 0 or p_weight > 100 then raise exception 'invalid_weight' using errcode='22023'; end if;

  insert into public.search_terms(
    id,market_code,canonical_term_ar,canonical_term_en,normalized_term,aliases,intent,entity_scope,
    match_mode,weight,source_basis,notes_ar,status,updated_by
  ) values (
    v_id,'IQ-BGD',btrim(p_canonical_term_ar),nullif(btrim(coalesce(p_canonical_term_en,'')),''),btrim(p_normalized_term),
    coalesce(p_aliases,array[]::text[]),p_intent,p_entity_scope,p_match_mode,p_weight,p_source_basis,
    'أضيف من لوحة حوكمة البحث ويحتاج إلى اعتماد بشري قبل التفعيل.','draft',v_actor
  );

  select to_jsonb(s) into v_after from public.search_terms s where s.id=v_id;
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,after_data,source)
  values(v_actor,'create_search_term_draft','search_terms',v_id::text,v_after,'search_atomic_create_v1');
  return jsonb_build_object('updated',true,'id',v_id,'record',v_after);
end $$;

create or replace function public.admin_update_search_term(
  p_term_id uuid,
  p_canonical_term_ar text,
  p_canonical_term_en text,
  p_normalized_term text,
  p_aliases text[],
  p_intent text,
  p_entity_scope text[],
  p_match_mode text,
  p_weight integer,
  p_source_basis text
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
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if length(btrim(coalesce(p_canonical_term_ar,''))) < 2 or length(btrim(coalesce(p_normalized_term,''))) < 2 then raise exception 'invalid_search_term' using errcode='22023'; end if;
  if p_intent not in ('broad','product','organization','content','origin') then raise exception 'invalid_search_intent' using errcode='22023'; end if;
  if coalesce(cardinality(p_entity_scope),0) < 1 or not (p_entity_scope <@ array['product','origin','content','organization']::text[]) then raise exception 'invalid_search_scope' using errcode='22023'; end if;
  if p_match_mode not in ('exact','prefix','contains') then raise exception 'invalid_match_mode' using errcode='22023'; end if;
  if p_source_basis not in ('platform_decision','industry_reference','observed_query') then raise exception 'invalid_source_basis' using errcode='22023'; end if;
  if p_weight < 0 or p_weight > 100 then raise exception 'invalid_weight' using errcode='22023'; end if;

  select to_jsonb(s) into v_before from public.search_terms s where s.id=p_term_id for update;
  if v_before is null then raise exception 'search_term_not_found' using errcode='P0002'; end if;

  update public.search_terms
  set canonical_term_ar=btrim(p_canonical_term_ar),
      canonical_term_en=nullif(btrim(coalesce(p_canonical_term_en,'')),''),
      normalized_term=btrim(p_normalized_term),
      aliases=coalesce(p_aliases,array[]::text[]),
      intent=p_intent,
      entity_scope=p_entity_scope,
      match_mode=p_match_mode,
      weight=p_weight,
      source_basis=p_source_basis,
      updated_by=v_actor
  where id=p_term_id;

  select to_jsonb(s) into v_after from public.search_terms s where s.id=p_term_id;
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'update_search_term','search_terms',p_term_id::text,v_before,v_after,'search_atomic_update_v1');
  return jsonb_build_object('updated',true,'id',p_term_id,'record',v_after);
end $$;

create or replace function public.admin_set_search_term_status(
  p_term_id uuid,
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
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if p_next_status not in ('draft','active','retired') then raise exception 'invalid_search_status' using errcode='22023'; end if;
  if p_next_status='active' and not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'verifier_required' using errcode='42501'; end if;

  select to_jsonb(s),s.status into v_before,v_current from public.search_terms s where s.id=p_term_id for update;
  if v_before is null then raise exception 'search_term_not_found' using errcode='P0002'; end if;
  if v_current=p_next_status then raise exception 'search_status_unchanged' using errcode='22023'; end if;

  update public.search_terms set status=p_next_status,updated_by=v_actor where id=p_term_id;
  select to_jsonb(s) into v_after from public.search_terms s where s.id=p_term_id;
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'set_search_term_'||p_next_status,'search_terms',p_term_id::text,v_before,v_after,'search_atomic_status_v1');
  return jsonb_build_object('updated',true,'id',p_term_id,'status',p_next_status,'record',v_after);
end $$;

create or replace function public.admin_delete_search_term(p_term_id uuid)
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
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  select to_jsonb(s),s.status into v_before,v_status from public.search_terms s where s.id=p_term_id for update;
  if v_before is null then raise exception 'search_term_not_found' using errcode='P0002'; end if;
  if v_status='active' then raise exception 'active_term_cannot_be_deleted' using errcode='23514'; end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'delete_search_term','search_terms',p_term_id::text,v_before,jsonb_build_object('deleted',true),'search_atomic_delete_v1');
  delete from public.search_terms where id=p_term_id;
  return jsonb_build_object('updated',true,'id',p_term_id,'deleted',true);
end $$;

revoke all on function public.admin_create_search_term(text,text,text,text[],text,text[],text,integer,text) from public,anon;
revoke all on function public.admin_update_search_term(uuid,text,text,text,text[],text,text[],text,integer,text) from public,anon;
revoke all on function public.admin_set_search_term_status(uuid,text) from public,anon;
revoke all on function public.admin_delete_search_term(uuid) from public,anon;
grant execute on function public.admin_create_search_term(text,text,text,text[],text,text[],text,integer,text) to authenticated;
grant execute on function public.admin_update_search_term(uuid,text,text,text,text[],text,text[],text,integer,text) to authenticated;
grant execute on function public.admin_set_search_term_status(uuid,text) to authenticated;
grant execute on function public.admin_delete_search_term(uuid) to authenticated;

commit;
