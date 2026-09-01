-- Coffee Platform V1 — Operations Center V2
-- Version: 1.0.0 | Date: 2026-08-18
begin;

alter table public.support_requests add column if not exists priority text not null default 'normal'
  check (priority in ('low','normal','high','urgent'));
alter table public.support_requests add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.support_requests add column if not exists internal_notes text;
alter table public.support_requests add column if not exists resolution_note text;
alter table public.support_requests add column if not exists technical_reference text;
alter table public.support_requests add column if not exists resolved_at timestamptz;
create index if not exists support_requests_assigned_status_idx on public.support_requests(assigned_to,status,priority);

create or replace function public.admin_create_catalog_draft(p_entity_type text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_market_id uuid;
  v_source_id uuid;
  v_entity_id uuid := gen_random_uuid();
  v_location_id uuid;
  v_slug text;
  v_source_type text;
begin
  if not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_entity_type not in ('organization','product','content','offer','origin') then raise exception 'unsupported_entity'; end if;
  select id into v_market_id from public.markets where code='IQ-BGD' limit 1;
  if v_market_id is null then raise exception 'market_missing'; end if;
  if length(trim(coalesce(p_payload->>'source_label',''))) < 3 then raise exception 'source_required'; end if;
  v_source_type := coalesce(nullif(p_payload->>'source_type',''),'editorial');
  if v_source_type not in ('manufacturer','official_registry','organization','seller','government','professional_body','research','editorial','other') then
    raise exception 'invalid_source_type';
  end if;
  v_source_id := gen_random_uuid();
  insert into public.source_records(id,source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt,created_by)
  values(v_source_id,
    'SRC-UI-' || upper(substr(replace(v_entity_id::text,'-',''),1,16)),
    trim(p_payload->>'source_label'),v_source_type,nullif(trim(p_payload->>'source_url'),''),
    trim(p_payload->>'source_label'),now(),'Facts entered by platform staff; no media copied',
    nullif(trim(p_payload->>'evidence_note'),''),v_actor);

  if p_entity_type='organization' then
    if length(trim(coalesce(p_payload->>'name_ar',''))) < 2 or length(trim(coalesce(p_payload->>'address_ar',''))) < 3 then raise exception 'invalid_organization'; end if;
    v_slug := 'organization-bgd-' || substr(replace(v_entity_id::text,'-',''),1,16);
    insert into public.organizations(id,slug,name_ar,name_en,description_ar,website_url,phone,email,verification_tier,status,source_checked_at,created_by)
    values(v_entity_id,v_slug,trim(p_payload->>'name_ar'),nullif(trim(p_payload->>'name_en'),''),nullif(trim(p_payload->>'description_ar'),''),nullif(trim(p_payload->>'website_url'),''),nullif(trim(p_payload->>'phone'),''),nullif(trim(p_payload->>'email'),''),'t2_source_checked','draft',now(),v_actor);
    insert into public.organization_roles(organization_id,role_type,is_primary)
    values(v_entity_id,(p_payload->>'role_type')::public.organization_role_type,true);
    v_location_id := gen_random_uuid();
    insert into public.locations(id,source_key,organization_id,market_id,name_ar,address_ar,district_ar,phone,status)
    values(v_location_id,'LOC-UI-'||upper(substr(replace(v_entity_id::text,'-',''),1,16)),v_entity_id,v_market_id,nullif(trim(p_payload->>'district_ar'),''),trim(p_payload->>'address_ar'),nullif(trim(p_payload->>'district_ar'),''),nullif(trim(p_payload->>'phone'),''),'draft');
    insert into public.entity_source_links(entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
    values('organizations',v_entity_id,v_source_id,array['identity','role','contact','location'],true,v_actor),('locations',v_location_id,v_source_id,array['address'],true,v_actor);
  elsif p_entity_type='product' then
    if length(trim(coalesce(p_payload->>'name_ar',''))) < 2 or (p_payload->>'category_id') is null then raise exception 'invalid_product'; end if;
    v_slug := 'product-bgd-' || substr(replace(v_entity_id::text,'-',''),1,16);
    insert into public.products(id,slug,name_ar,name_en,summary_ar,description_ar,product_kind,brand_id,owner_organization_id,model_number,verification_tier,status,source_checked_at,created_by)
    values(v_entity_id,v_slug,trim(p_payload->>'name_ar'),nullif(trim(p_payload->>'name_en'),''),nullif(trim(p_payload->>'summary_ar'),''),nullif(trim(p_payload->>'description_ar'),''),
      (p_payload->>'product_kind'),nullif(p_payload->>'brand_id','')::uuid,nullif(p_payload->>'owner_organization_id','')::uuid,nullif(trim(p_payload->>'model_number'),''),'t2_source_checked','draft',now(),v_actor);
    insert into public.product_categories(product_id,category_id,is_primary) values(v_entity_id,(p_payload->>'category_id')::uuid,true);
    insert into public.entity_source_links(entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
    values('products',v_entity_id,v_source_id,array['identity','category','description'],true,v_actor);
  elsif p_entity_type='content' then
    if length(trim(coalesce(p_payload->>'title_ar',''))) < 3 or length(trim(coalesce(p_payload->>'body_ar',''))) < 20 then raise exception 'invalid_content'; end if;
    v_slug := 'knowledge-bgd-' || substr(replace(v_entity_id::text,'-',''),1,16);
    insert into public.contents(id,slug,type,title_ar,title_en,excerpt_ar,body_ar,author_profile_id,status)
    values(v_entity_id,v_slug,(p_payload->>'content_type')::public.content_type,trim(p_payload->>'title_ar'),nullif(trim(p_payload->>'title_en'),''),nullif(trim(p_payload->>'excerpt_ar'),''),trim(p_payload->>'body_ar'),v_actor,'draft');
    insert into public.entity_source_links(entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
    values('contents',v_entity_id,v_source_id,array['title','body'],true,v_actor);
  elsif p_entity_type='offer' then
    if nullif(p_payload->>'product_id','') is null or nullif(p_payload->>'seller_organization_id','') is null or nullif(p_payload->>'external_url','') is null then raise exception 'invalid_offer'; end if;
    insert into public.offers(id,product_id,seller_organization_id,market_id,price,currency_code,availability,external_url,observed_at,source_record_id,status)
    values(v_entity_id,(p_payload->>'product_id')::uuid,(p_payload->>'seller_organization_id')::uuid,v_market_id,
      nullif(p_payload->>'price','')::numeric,coalesce(nullif(p_payload->>'currency_code',''),'IQD'),
      coalesce(nullif(p_payload->>'availability',''),'unknown')::public.availability_status,trim(p_payload->>'external_url'),
      coalesce(nullif(p_payload->>'observed_at','')::timestamptz,now()),v_source_id,'draft');
  else
    if nullif(p_payload->>'product_id','') is null or nullif(p_payload->>'country_code','') is null then raise exception 'invalid_origin'; end if;
    insert into public.origin_claims(id,product_id,country_code,coffee_region_id,farm_or_producer_name,lot_reference,process_code,variety_codes,harvest_label,source_record_id,verification_tier)
    values(v_entity_id,(p_payload->>'product_id')::uuid,p_payload->>'country_code',nullif(p_payload->>'coffee_region_id','')::uuid,
      nullif(trim(p_payload->>'farm_or_producer_name'),''),nullif(trim(p_payload->>'lot_reference'),''),nullif(trim(p_payload->>'process_code'),''),
      string_to_array(coalesce(p_payload->>'variety_codes',''),','),nullif(trim(p_payload->>'harvest_label'),''),v_source_id,'t2_source_checked');
  end if;
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,after_data,source)
  values(v_actor,'create_'||p_entity_type||'_draft',case when p_entity_type='organization' then 'organizations' when p_entity_type='product' then 'products' when p_entity_type='content' then 'contents' when p_entity_type='offer' then 'offers' else 'origin_claims' end,v_entity_id::text,p_payload,'operations_center_v2');
  return jsonb_build_object('entity_type',p_entity_type,'id',v_entity_id,'status','draft');
end;
$$;

revoke all on function public.admin_create_catalog_draft(text,jsonb) from public,anon;
grant execute on function public.admin_create_catalog_draft(text,jsonb) to authenticated;
comment on function public.admin_create_catalog_draft(text,jsonb) is 'Admin-only atomic draft creation for products, knowledge content, offers, and coffee origins.';

commit;
