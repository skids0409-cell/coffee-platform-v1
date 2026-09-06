-- Atomic Partner submission decision boundary.
-- Approval-side canonical writes, submission lifecycle state and audit evidence
-- are committed or rolled back as one transaction.
begin;

create or replace function public.admin_transition_partner_submission(
  p_submission_id uuid,
  p_next_status text,
  p_review_note text default null
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
  v_entity_type text;
  v_org_id uuid;
  v_payload jsonb;
  v_note text := nullif(btrim(coalesce(p_review_note,'')), '');
  v_canonical jsonb := null;
  v_patch jsonb := '{}'::jsonb;
  v_market_id uuid;
  v_location_id uuid;
  v_contract_revision text;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;
  if p_next_status not in ('in_review','needs_changes','approved','rejected') then
    raise exception 'invalid_partner_status' using errcode='22023';
  end if;
  if p_next_status in ('needs_changes','rejected') and coalesce(length(v_note),0) < 10 then
    raise exception 'review_note_required' using errcode='22023';
  end if;

  select to_jsonb(s),s.status,s.entity_type,s.organization_id,s.payload
    into v_before,v_current,v_entity_type,v_org_id,v_payload
  from public.partner_submissions s
  where s.id=p_submission_id
  for update;

  if v_before is null then raise exception 'partner_submission_not_found' using errcode='P0002'; end if;
  if v_current not in ('submitted','in_review','needs_changes') then
    raise exception 'partner_submission_not_reviewable' using errcode='23514';
  end if;

  if p_next_status='approved' then
    if v_entity_type='organization_update' then
      if jsonb_typeof(v_payload->'name_ar')='string' then v_patch := v_patch || jsonb_build_object('name_ar',nullif(btrim(v_payload->>'name_ar'),'')); end if;
      if jsonb_typeof(v_payload->'name_en')='string' then v_patch := v_patch || jsonb_build_object('name_en',nullif(btrim(v_payload->>'name_en'),'')); end if;
      if jsonb_typeof(v_payload->'description_ar')='string' then v_patch := v_patch || jsonb_build_object('description_ar',nullif(btrim(v_payload->>'description_ar'),'')); end if;
      if jsonb_typeof(v_payload->'phone')='string' then v_patch := v_patch || jsonb_build_object('phone',nullif(btrim(v_payload->>'phone'),'')); end if;
      if jsonb_typeof(v_payload->'email')='string' then v_patch := v_patch || jsonb_build_object('email',nullif(btrim(v_payload->>'email'),'')); end if;
      if jsonb_typeof(v_payload->'website_url')='string' then v_patch := v_patch || jsonb_build_object('website_url',nullif(btrim(v_payload->>'website_url'),'')); end if;
      if v_patch = '{}'::jsonb then raise exception 'canonical_write_failed' using errcode='22023'; end if;

      update public.organizations o
      set name_ar=case when v_patch ? 'name_ar' then v_patch->>'name_ar' else o.name_ar end,
          name_en=case when v_patch ? 'name_en' then v_patch->>'name_en' else o.name_en end,
          description_ar=case when v_patch ? 'description_ar' then v_patch->>'description_ar' else o.description_ar end,
          phone=case when v_patch ? 'phone' then v_patch->>'phone' else o.phone end,
          email=case when v_patch ? 'email' then v_patch->>'email' else o.email end,
          website_url=case when v_patch ? 'website_url' then v_patch->>'website_url' else o.website_url end
      where o.id=v_org_id
      returning jsonb_build_object('id',o.id,'name_ar',o.name_ar,'slug',o.slug,'status',o.status) into v_canonical;

    elsif v_entity_type='product_offer' then
      v_canonical := public.admin_create_catalog_draft(
        'offer',
        v_payload || jsonb_build_object(
          'seller_organization_id',v_org_id,
          'source_label',coalesce(nullif(v_payload->>'source_label',''),'بوابة الجهة المشاركة'),
          'source_type',coalesce(nullif(v_payload->>'source_type',''),'organization')
        )
      );

    elsif v_entity_type='new_product' then
      v_contract_revision := public.admin_record_contract_revision();
      v_canonical := public.admin_create_product_draft_v2(
        v_payload || jsonb_build_object(
          'owner_organization_id',v_org_id,
          'source_label',coalesce(nullif(v_payload->>'source_label',''),'بوابة الجهة المشاركة'),
          'source_type',coalesce(nullif(v_payload->>'source_type',''),'organization')
        ),
        '[]'::jsonb,
        v_contract_revision
      ) || jsonb_build_object('status','attached');

    elsif v_entity_type='location' then
      select id into v_market_id from public.markets where code='IQ-BGD' limit 1;
      if v_market_id is null or length(btrim(coalesce(v_payload->>'address_ar',''))) < 3 then
        raise exception 'location_data_missing' using errcode='22023';
      end if;
      v_location_id := gen_random_uuid();
      insert into public.locations(
        id,source_key,organization_id,market_id,name_ar,address_ar,district_ar,phone,opening_hours,services,status
      ) values (
        v_location_id,
        'LOC-PARTNER-'||upper(substr(replace(v_location_id::text,'-',''),1,12)),
        v_org_id,
        v_market_id,
        nullif(btrim(v_payload->>'name_ar'),''),
        btrim(v_payload->>'address_ar'),
        nullif(btrim(v_payload->>'district_ar'),''),
        nullif(btrim(v_payload->>'phone'),''),
        coalesce(v_payload->'opening_hours','{}'::jsonb),
        coalesce(array(select jsonb_array_elements_text(coalesce(v_payload->'services','[]'::jsonb))),array[]::text[]),
        'draft'
      );
      select jsonb_build_object('id',l.id,'status',l.status) into v_canonical
      from public.locations l where l.id=v_location_id;
    else
      raise exception 'unsupported_partner_entity' using errcode='22023';
    end if;

    if v_canonical is null then raise exception 'canonical_write_failed' using errcode='P0001'; end if;
  end if;

  update public.partner_submissions
  set status=p_next_status,
      review_note=v_note,
      reviewed_by=v_actor,
      reviewed_at=now(),
      payload=case when v_canonical is null then v_payload else v_payload || jsonb_build_object('canonical_result',v_canonical) end
  where id=p_submission_id;

  select to_jsonb(s) into v_after from public.partner_submissions s where s.id=p_submission_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(
    v_actor,
    'partner_submission_'||p_next_status,
    'partner_submissions',
    p_submission_id::text,
    v_before,
    jsonb_build_object('status',p_next_status,'review_note',v_note,'canonical',v_canonical,'record',v_after),
    'partner_atomic_transition_v1'
  );

  return jsonb_build_object('updated',true,'id',p_submission_id,'status',p_next_status,'canonical',v_canonical,'record',v_after);
end $$;

revoke all on function public.admin_transition_partner_submission(uuid,text,text) from public,anon;
grant execute on function public.admin_transition_partner_submission(uuid,text,text) to authenticated;

commit;
