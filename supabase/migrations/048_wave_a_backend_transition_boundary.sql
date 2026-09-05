-- Wave A / Phase 2 — Backend Transition Boundary
-- Centralize governed record mutations behind audited SECURITY INVOKER RPCs.
begin;

create or replace function public.admin_update_governed_record(
  p_entity text,
  p_entity_id uuid,
  p_fields jsonb,
  p_issue_updates jsonb default '[]'::jsonb
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
  v_issue jsonb;
  v_location_id uuid;
  v_kind text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_entity not in ('organizations','brands','offers','contents','origin_claims') then
    raise exception 'unsupported_governed_entity';
  end if;
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'invalid_fields';
  end if;

  if p_entity='organizations' then
    select to_jsonb(o) into v_before from public.organizations o where o.id=p_entity_id for update;
    if v_before is null then raise exception 'record_not_found'; end if;
    if nullif(trim(p_fields->>'name_ar'),'') is null then raise exception 'invalid_input'; end if;
    update public.organizations
    set name_ar=left(trim(p_fields->>'name_ar'),160),
        name_en=nullif(left(trim(coalesce(p_fields->>'name_en','')),160),''),
        description_ar=nullif(left(trim(coalesce(p_fields->>'description_ar','')),4000),''),
        website_url=nullif(left(trim(coalesce(p_fields->>'website_url','')),500),''),
        phone=nullif(left(trim(coalesce(p_fields->>'phone','')),80),''),
        email=nullif(left(trim(coalesce(p_fields->>'email','')),200),'')
    where id=p_entity_id;
    select l.id into v_location_id from public.locations l where l.organization_id=p_entity_id order by l.created_at,l.id limit 1 for update;
    if v_location_id is not null then
      update public.locations
      set address_ar=left(trim(coalesce(p_fields->>'address_ar','')),400),
          district_ar=nullif(left(trim(coalesce(p_fields->>'district_ar','')),160),''),
          phone=nullif(left(trim(coalesce(p_fields->>'location_phone','')),80),'')
      where id=v_location_id;
    end if;
    select to_jsonb(o) into v_after from public.organizations o where o.id=p_entity_id;

  elsif p_entity='brands' then
    select to_jsonb(b) into v_before from public.brands b where b.id=p_entity_id for update;
    if v_before is null then raise exception 'record_not_found'; end if;
    v_kind:=trim(coalesce(p_fields->>'product_kind',''));
    if nullif(trim(p_fields->>'name_ar'),'') is null or v_kind not in ('roasted_coffee','equipment','consumable','care_product','replacement_part') then
      raise exception 'invalid_input';
    end if;
    update public.brands
    set name_ar=left(trim(p_fields->>'name_ar'),160),
        name_en=nullif(left(trim(coalesce(p_fields->>'name_en','')),160),''),
        website_url=nullif(left(trim(coalesce(p_fields->>'website_url','')),500),''),
        manufacturer_organization_id=case when coalesce(p_fields->>'manufacturer_organization_id','') ~* '^[0-9a-f-]{36}$' then (p_fields->>'manufacturer_organization_id')::uuid else null end
    where id=p_entity_id;
    delete from public.brand_product_kinds where brand_id=p_entity_id;
    insert into public.brand_product_kinds(brand_id,product_kind) values(p_entity_id,v_kind);
    select to_jsonb(b) into v_after from public.brands b where b.id=p_entity_id;

  elsif p_entity='offers' then
    select to_jsonb(o) into v_before from public.offers o where o.id=p_entity_id for update;
    if v_before is null then raise exception 'record_not_found'; end if;
    update public.offers
    set price=nullif(p_fields->>'price','')::numeric,
        currency_code=left(coalesce(nullif(trim(p_fields->>'currency_code'),''),'IQD'),3),
        availability=(p_fields->>'availability')::public.availability_status,
        external_url=left(trim(coalesce(p_fields->>'external_url','')),1000),
        observed_at=coalesce(nullif(p_fields->>'observed_at','')::timestamptz,now())
    where id=p_entity_id;
    select to_jsonb(o) into v_after from public.offers o where o.id=p_entity_id;

  elsif p_entity='contents' then
    select to_jsonb(c) into v_before from public.contents c where c.id=p_entity_id for update;
    if v_before is null then raise exception 'record_not_found'; end if;
    if nullif(trim(p_fields->>'title_ar'),'') is null or length(trim(coalesce(p_fields->>'body_ar',''))) < 20 then raise exception 'invalid_input'; end if;
    update public.contents
    set title_ar=left(trim(p_fields->>'title_ar'),200),
        title_en=nullif(left(trim(coalesce(p_fields->>'title_en','')),200),''),
        excerpt_ar=nullif(left(trim(coalesce(p_fields->>'excerpt_ar','')),1000),''),
        body_ar=left(trim(coalesce(p_fields->>'body_ar','')),20000)
    where id=p_entity_id;
    select to_jsonb(c) into v_after from public.contents c where c.id=p_entity_id;

  else
    select to_jsonb(o) into v_before from public.origin_claims o where o.id=p_entity_id for update;
    if v_before is null then raise exception 'record_not_found'; end if;
    update public.origin_claims
    set farm_or_producer_name=nullif(left(trim(coalesce(p_fields->>'farm_or_producer_name','')),300),''),
        lot_reference=nullif(left(trim(coalesce(p_fields->>'lot_reference','')),160),''),
        process_code=nullif(left(trim(coalesce(p_fields->>'process_code','')),120),''),
        variety_codes=case when jsonb_typeof(p_fields->'variety_codes')='array' then array(select jsonb_array_elements_text(p_fields->'variety_codes')) else string_to_array(replace(coalesce(p_fields->>'variety_codes',''),'،',','),',') end,
        harvest_label=nullif(left(trim(coalesce(p_fields->>'harvest_label','')),120),'')
    where id=p_entity_id;
    select to_jsonb(o) into v_after from public.origin_claims o where o.id=p_entity_id;
  end if;

  if jsonb_typeof(coalesce(p_issue_updates,'[]'::jsonb))='array' then
    for v_issue in select value from jsonb_array_elements(coalesce(p_issue_updates,'[]'::jsonb)) loop
      if coalesce(v_issue->>'id','') ~* '^[0-9a-f-]{36}$' and coalesce(v_issue->>'status','') in ('accepted','fixed','dismissed') then
        update public.data_quality_issues
        set status=v_issue->>'status',
            resolution_note=coalesce(nullif(left(trim(coalesce(v_issue->>'resolutionNote','')),1000),''),'قرار إداري موثق من مركز العمليات'),
            resolved_by=v_actor,
            resolved_at=now()
        where id=(v_issue->>'id')::uuid and entity_table=p_entity and entity_id=p_entity_id;
      end if;
    end loop;
  end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'governed_record_update',p_entity,p_entity_id::text,v_before,v_after,'governance_transition_boundary_v1');

  return jsonb_build_object('updated',true,'entity',p_entity,'id',p_entity_id,'audit_action','governed_record_update');
end $$;

revoke all on function public.admin_update_governed_record(text,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_update_governed_record(text,uuid,jsonb,jsonb) to authenticated;

create or replace function public.admin_restore_governed_record_revision(
  p_entity text,
  p_entity_id uuid,
  p_event_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_snapshot jsonb;
  v_before jsonb;
  v_after jsonb;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then
    raise exception 'verifier_required' using errcode='42501';
  end if;
  if p_entity not in ('organizations','brands','products','offers','contents','origin_claims') then raise exception 'unsupported_governed_entity'; end if;

  select ae.before_data into v_snapshot
  from public.audit_events ae
  where ae.id=p_event_id and ae.entity_table=p_entity and ae.entity_id=p_entity_id::text;
  if v_snapshot is null or jsonb_typeof(v_snapshot)<>'object' then raise exception 'revision_not_found'; end if;

  if p_entity='organizations' then
    select to_jsonb(x) into v_before from public.organizations x where id=p_entity_id for update;
    update public.organizations x set
      name_ar=coalesce(v_snapshot->>'name_ar',x.name_ar), name_en=case when v_snapshot ? 'name_en' then v_snapshot->>'name_en' else x.name_en end,
      description_ar=case when v_snapshot ? 'description_ar' then v_snapshot->>'description_ar' else x.description_ar end,
      description_en=case when v_snapshot ? 'description_en' then v_snapshot->>'description_en' else x.description_en end,
      website_url=case when v_snapshot ? 'website_url' then v_snapshot->>'website_url' else x.website_url end,
      phone=case when v_snapshot ? 'phone' then v_snapshot->>'phone' else x.phone end,
      email=case when v_snapshot ? 'email' then v_snapshot->>'email' else x.email end,
      logo_url=case when v_snapshot ? 'logo_url' then v_snapshot->>'logo_url' else x.logo_url end
    where id=p_entity_id;
    select to_jsonb(x) into v_after from public.organizations x where id=p_entity_id;
  elsif p_entity='brands' then
    select to_jsonb(x) into v_before from public.brands x where id=p_entity_id for update;
    update public.brands x set name_ar=coalesce(v_snapshot->>'name_ar',x.name_ar),name_en=case when v_snapshot ? 'name_en' then v_snapshot->>'name_en' else x.name_en end,website_url=case when v_snapshot ? 'website_url' then v_snapshot->>'website_url' else x.website_url end,logo_url=case when v_snapshot ? 'logo_url' then v_snapshot->>'logo_url' else x.logo_url end,manufacturer_organization_id=case when v_snapshot ? 'manufacturer_organization_id' and coalesce(v_snapshot->>'manufacturer_organization_id','')<>'' then (v_snapshot->>'manufacturer_organization_id')::uuid when v_snapshot ? 'manufacturer_organization_id' then null else x.manufacturer_organization_id end where id=p_entity_id;
    select to_jsonb(x) into v_after from public.brands x where id=p_entity_id;
  elsif p_entity='products' then
    select to_jsonb(x) into v_before from public.products x where id=p_entity_id for update;
    update public.products x set name_ar=coalesce(v_snapshot->>'name_ar',x.name_ar),name_en=case when v_snapshot ? 'name_en' then v_snapshot->>'name_en' else x.name_en end,summary_ar=case when v_snapshot ? 'summary_ar' then v_snapshot->>'summary_ar' else x.summary_ar end,summary_en=case when v_snapshot ? 'summary_en' then v_snapshot->>'summary_en' else x.summary_en end,description_ar=case when v_snapshot ? 'description_ar' then v_snapshot->>'description_ar' else x.description_ar end,description_en=case when v_snapshot ? 'description_en' then v_snapshot->>'description_en' else x.description_en end,model_number=case when v_snapshot ? 'model_number' then v_snapshot->>'model_number' else x.model_number end where id=p_entity_id;
    select to_jsonb(x) into v_after from public.products x where id=p_entity_id;
  elsif p_entity='offers' then
    select to_jsonb(x) into v_before from public.offers x where id=p_entity_id for update;
    update public.offers x set price=case when v_snapshot ? 'price' then (v_snapshot->>'price')::numeric else x.price end,currency_code=case when v_snapshot ? 'currency_code' then v_snapshot->>'currency_code' else x.currency_code end,availability=case when v_snapshot ? 'availability' then (v_snapshot->>'availability')::public.availability_status else x.availability end,external_url=coalesce(v_snapshot->>'external_url',x.external_url),observed_at=case when v_snapshot ? 'observed_at' then (v_snapshot->>'observed_at')::timestamptz else x.observed_at end where id=p_entity_id;
    select to_jsonb(x) into v_after from public.offers x where id=p_entity_id;
  elsif p_entity='contents' then
    select to_jsonb(x) into v_before from public.contents x where id=p_entity_id for update;
    update public.contents x set title_ar=coalesce(v_snapshot->>'title_ar',x.title_ar),title_en=case when v_snapshot ? 'title_en' then v_snapshot->>'title_en' else x.title_en end,excerpt_ar=case when v_snapshot ? 'excerpt_ar' then v_snapshot->>'excerpt_ar' else x.excerpt_ar end,excerpt_en=case when v_snapshot ? 'excerpt_en' then v_snapshot->>'excerpt_en' else x.excerpt_en end,body_ar=case when v_snapshot ? 'body_ar' then v_snapshot->>'body_ar' else x.body_ar end,body_en=case when v_snapshot ? 'body_en' then v_snapshot->>'body_en' else x.body_en end where id=p_entity_id;
    select to_jsonb(x) into v_after from public.contents x where id=p_entity_id;
  else
    select to_jsonb(x) into v_before from public.origin_claims x where id=p_entity_id for update;
    update public.origin_claims x set country_code=case when v_snapshot ? 'country_code' then v_snapshot->>'country_code' else x.country_code end,coffee_region_id=case when v_snapshot ? 'coffee_region_id' and coalesce(v_snapshot->>'coffee_region_id','')<>'' then (v_snapshot->>'coffee_region_id')::uuid when v_snapshot ? 'coffee_region_id' then null else x.coffee_region_id end,farm_or_producer_name=case when v_snapshot ? 'farm_or_producer_name' then v_snapshot->>'farm_or_producer_name' else x.farm_or_producer_name end,lot_reference=case when v_snapshot ? 'lot_reference' then v_snapshot->>'lot_reference' else x.lot_reference end,process_code=case when v_snapshot ? 'process_code' then v_snapshot->>'process_code' else x.process_code end,variety_codes=case when v_snapshot ? 'variety_codes' then array(select jsonb_array_elements_text(v_snapshot->'variety_codes')) else x.variety_codes end,harvest_label=case when v_snapshot ? 'harvest_label' then v_snapshot->>'harvest_label' else x.harvest_label end where id=p_entity_id;
    select to_jsonb(x) into v_after from public.origin_claims x where id=p_entity_id;
  end if;

  if v_before is null then raise exception 'record_not_found'; end if;
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'restore_record_revision',p_entity,p_entity_id::text,v_before,jsonb_build_object('restored_from_event',p_event_id,'record',v_after),'governance_transition_boundary_v1');
  return jsonb_build_object('restored',true,'entity',p_entity,'id',p_entity_id,'restored_from_event',p_event_id);
end $$;

revoke all on function public.admin_restore_governed_record_revision(text,uuid,bigint) from public,anon;
grant execute on function public.admin_restore_governed_record_revision(text,uuid,bigint) to authenticated;

commit;