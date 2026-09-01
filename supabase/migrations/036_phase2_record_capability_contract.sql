-- Coffee Platform V1 — Phase 2 server-owned record capability contract
-- Non-destructive taxonomy classification plus atomic product create/update RPCs.
begin;

update public.categories
set catalog_product_kind = 'roasted_coffee', updated_at = now()
where code = 'COF-ROASTED' and catalog_product_kind is null;

create or replace function public.admin_record_contract_revision()
returns text
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_revision text;
begin
  if auth.uid() is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode = '42501';
  end if;
  select md5(
    coalesce((select string_agg(concat_ws('|',c.id,c.code,c.status,c.parent_id,c.navigation_parent_id,c.catalog_family_id,c.catalog_filter_id,c.catalog_product_kind,c.is_navigation_visible,c.updated_at),'~' order by c.id) from public.categories c),'') || '#' ||
    coalesce((select string_agg(concat_ws('|',fd.id,fd.category_id,fd.field_definition_id,fd.status,fd.sort_order,fd.is_required_for_publish,fd.updated_at,f.data_type,f.unit_code,f.allowed_values,f.validation_rules,f.missing_value_policy,f.updated_at),'~' order by fd.id) from public.filter_definitions fd join public.field_definitions f on f.id=fd.field_definition_id),'') || '#' ||
    coalesce((select string_agg(concat_ws('|',bpk.brand_id,bpk.product_kind),'~' order by bpk.brand_id,bpk.product_kind) from public.brand_product_kinds bpk),'')
  ) into v_revision;
  return v_revision;
end;
$$;

create or replace function public.admin_create_product_draft_v2(
  p_payload jsonb,
  p_values jsonb,
  p_contract_revision text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_kind text := trim(coalesce(p_payload->>'product_kind',''));
  v_category_id uuid := nullif(p_payload->>'category_id','')::uuid;
  v_brand_id uuid := nullif(p_payload->>'brand_id','')::uuid;
  v_market_id uuid;
  v_source_id uuid := gen_random_uuid();
  v_product_id uuid := gen_random_uuid();
  v_slug text := 'product-bgd-' || substr(replace(v_product_id::text,'-',''),1,16);
  v_source_type text := coalesce(nullif(p_payload->>'source_type',''),'editorial');
  v_category public.categories%rowtype;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if p_contract_revision is distinct from public.admin_record_contract_revision() then raise exception 'contract_revision_stale' using errcode='40001'; end if;
  if v_kind not in ('roasted_coffee','equipment','consumable','care_product','replacement_part') then raise exception 'invalid_product_kind'; end if;
  if length(trim(coalesce(p_payload->>'name_ar',''))) < 2 or v_category_id is null then raise exception 'invalid_product'; end if;
  if length(trim(coalesce(p_payload->>'source_label',''))) < 3 then raise exception 'source_required'; end if;
  if v_source_type not in ('manufacturer','official_registry','organization','seller','government','professional_body','research','editorial','other') then raise exception 'invalid_source_type'; end if;

  select * into v_category from public.categories where id=v_category_id and status='published';
  if not found or v_category.catalog_product_kind is distinct from v_kind then raise exception 'category_kind_mismatch'; end if;
  if v_brand_id is not null and exists(select 1 from public.brand_product_kinds where brand_id=v_brand_id)
     and not exists(select 1 from public.brand_product_kinds where brand_id=v_brand_id and product_kind=v_kind) then raise exception 'brand_kind_mismatch'; end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid)
    left join public.filter_definitions fd on fd.field_definition_id=x.field_definition_id and fd.status='published'
      and fd.category_id in (v_category.id,v_category.catalog_filter_id,v_category.catalog_family_id)
    where fd.id is null
  ) then raise exception 'attribute_not_allowed'; end if;
  if exists (
    select x.field_definition_id from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid)
    group by x.field_definition_id having count(*) > 1
  ) then raise exception 'duplicate_attribute'; end if;

  select id into v_market_id from public.markets where code='IQ-BGD' limit 1;
  if v_market_id is null then raise exception 'market_missing'; end if;
  insert into public.source_records(id,source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt,created_by)
  values(v_source_id,'SRC-UI-'||upper(substr(replace(v_product_id::text,'-',''),1,16)),trim(p_payload->>'source_label'),v_source_type,
    nullif(trim(p_payload->>'source_url'),''),trim(p_payload->>'source_label'),now(),'Facts entered by platform staff; no media copied',nullif(trim(p_payload->>'evidence_note'),''),v_actor);
  insert into public.products(id,slug,name_ar,name_en,summary_ar,description_ar,product_kind,brand_id,owner_organization_id,model_number,verification_tier,status,source_checked_at,created_by)
  values(v_product_id,v_slug,trim(p_payload->>'name_ar'),nullif(trim(p_payload->>'name_en'),''),nullif(trim(p_payload->>'summary_ar'),''),nullif(trim(p_payload->>'description_ar'),''),
    v_kind,v_brand_id,nullif(p_payload->>'owner_organization_id','')::uuid,nullif(trim(p_payload->>'model_number'),''),'t2_source_checked','draft',now(),v_actor);
  insert into public.product_categories(product_id,category_id,is_primary) values(v_product_id,v_category_id,true);
  insert into public.product_attribute_values(product_id,field_definition_id,value_text,value_integer,value_decimal,value_boolean,value_date,value_json,unit_code,source_record_id,observed_at)
  select v_product_id,x.field_definition_id,x.value_text,x.value_integer,x.value_decimal,x.value_boolean,x.value_date,x.value_json,x.unit_code,v_source_id,now()
  from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid,value_text text,value_integer bigint,value_decimal numeric,value_boolean boolean,value_date date,value_json jsonb,unit_code text);
  insert into public.entity_source_links(entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
  values('products',v_product_id,v_source_id,array['identity','category','description','attributes'],true,v_actor);
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,after_data,source)
  values(v_actor,'create_product_draft','products',v_product_id::text,p_payload||jsonb_build_object('contract_revision',p_contract_revision,'attribute_count',jsonb_array_length(coalesce(p_values,'[]'::jsonb))),'record_capability_phase2');
  return jsonb_build_object('entity_type','product','id',v_product_id,'status','draft','contract_revision',public.admin_record_contract_revision());
end;
$$;

create or replace function public.admin_update_product_v2(
  p_product_id uuid,
  p_fields jsonb,
  p_values jsonb,
  p_issue_updates jsonb,
  p_contract_revision text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_product public.products%rowtype;
  v_before jsonb;
  v_category public.categories%rowtype;
  v_category_id uuid := nullif(p_fields->>'category_id','')::uuid;
  v_brand_id uuid := nullif(p_fields->>'brand_id','')::uuid;
  v_primary_source_id uuid;
begin
  if v_actor is null or not (select private.is_staff()) then raise exception 'staff_required' using errcode='42501'; end if;
  if p_contract_revision is distinct from public.admin_record_contract_revision() then raise exception 'contract_revision_stale' using errcode='40001'; end if;
  select * into v_product from public.products where id=p_product_id for update;
  if not found then raise exception 'product_not_found'; end if;
  v_before := to_jsonb(v_product);
  if nullif(p_fields->>'product_kind','') is not null and p_fields->>'product_kind' is distinct from v_product.product_kind then raise exception 'product_kind_immutable'; end if;
  if length(trim(coalesce(p_fields->>'name_ar',''))) < 2 or v_category_id is null then raise exception 'invalid_product'; end if;
  select * into v_category from public.categories where id=v_category_id and status='published';
  if not found or v_category.catalog_product_kind is distinct from v_product.product_kind then raise exception 'category_kind_mismatch'; end if;
  if v_brand_id is not null and exists(select 1 from public.brand_product_kinds where brand_id=v_brand_id)
     and not exists(select 1 from public.brand_product_kinds where brand_id=v_brand_id and product_kind=v_product.product_kind) then raise exception 'brand_kind_mismatch'; end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid)
    left join public.filter_definitions fd on fd.field_definition_id=x.field_definition_id and fd.status='published'
      and fd.category_id in (v_category.id,v_category.catalog_filter_id,v_category.catalog_family_id)
    where fd.id is null
  ) then raise exception 'attribute_not_allowed'; end if;
  if exists (
    select x.field_definition_id from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid)
    group by x.field_definition_id having count(*) > 1
  ) then raise exception 'duplicate_attribute'; end if;

  select esl.source_record_id into v_primary_source_id from public.entity_source_links esl where esl.entity_table='products' and esl.entity_id=p_product_id and esl.is_primary order by esl.created_at limit 1;
  update public.products set
    name_ar=trim(p_fields->>'name_ar'), name_en=nullif(trim(p_fields->>'name_en'),''), summary_ar=nullif(trim(p_fields->>'summary_ar'),''),
    description_ar=nullif(trim(p_fields->>'description_ar'),''), model_number=nullif(trim(p_fields->>'model_number'),''), brand_id=v_brand_id,
    owner_organization_id=nullif(p_fields->>'owner_organization_id','')::uuid, updated_at=now()
  where id=p_product_id;
  delete from public.product_categories where product_id=p_product_id and is_primary;
  insert into public.product_categories(product_id,category_id,is_primary) values(p_product_id,v_category_id,true)
  on conflict(product_id,category_id) do update set is_primary=true;
  delete from public.product_attribute_values where product_id=p_product_id;
  insert into public.product_attribute_values(product_id,field_definition_id,value_text,value_integer,value_decimal,value_boolean,value_date,value_json,unit_code,source_record_id,observed_at)
  select p_product_id,x.field_definition_id,x.value_text,x.value_integer,x.value_decimal,x.value_boolean,x.value_date,x.value_json,x.unit_code,
    coalesce(x.source_record_id,v_primary_source_id),now()
  from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) x(field_definition_id uuid,value_text text,value_integer bigint,value_decimal numeric,value_boolean boolean,value_date date,value_json jsonb,unit_code text,source_record_id uuid);
  update public.data_quality_issues dqi set
    status=x.status, resolution_note=coalesce(nullif(trim(x.resolution_note),''),'قرار إداري موثق من مركز العمليات'), resolved_by=v_actor, resolved_at=now(), updated_at=now()
  from jsonb_to_recordset(coalesce(p_issue_updates,'[]'::jsonb)) x(id uuid,status text,resolution_note text)
  where dqi.id=x.id and dqi.entity_table='products' and dqi.entity_id=p_product_id and x.status in ('accepted','fixed','dismissed');
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,'edit_record_before_publication','products',p_product_id::text,v_before,p_fields||jsonb_build_object('contract_revision',p_contract_revision,'attribute_count',jsonb_array_length(coalesce(p_values,'[]'::jsonb))),'record_capability_phase2');
  return jsonb_build_object('id',p_product_id,'status',v_product.status,'contract_revision',public.admin_record_contract_revision());
end;
$$;

revoke all on function public.admin_record_contract_revision() from public,anon;
revoke all on function public.admin_create_product_draft_v2(jsonb,jsonb,text) from public,anon;
revoke all on function public.admin_update_product_v2(uuid,jsonb,jsonb,jsonb,text) from public,anon;
grant execute on function public.admin_record_contract_revision() to authenticated;
grant execute on function public.admin_create_product_draft_v2(jsonb,jsonb,text) to authenticated;
grant execute on function public.admin_update_product_v2(uuid,jsonb,jsonb,jsonb,text) to authenticated;

comment on function public.admin_record_contract_revision() is 'Opaque revision for the server-owned record capability contract.';
comment on function public.admin_create_product_draft_v2(jsonb,jsonb,text) is 'Atomic staff-only product draft creation guarded by capability revision and strict product-kind taxonomy.';
comment on function public.admin_update_product_v2(uuid,jsonb,jsonb,jsonb,text) is 'Atomic staff-only product edit guarded by capability revision and strict product-kind taxonomy.';

commit;

