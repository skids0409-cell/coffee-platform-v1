-- Coffee Platform V1 — governed brand families and admin draft creation
-- Version: 1.0.0 | Date: 2026-08-19
begin;

create table if not exists public.brand_product_kinds (
  brand_id uuid not null references public.brands(id) on delete cascade,
  product_kind text not null check (product_kind in ('roasted_coffee','equipment','consumable','care_product','replacement_part')),
  created_at timestamptz not null default now(),
  primary key (brand_id, product_kind)
);

insert into public.brand_product_kinds(brand_id,product_kind)
select distinct brand_id,product_kind from public.products where brand_id is not null
on conflict do nothing;

alter table public.brand_product_kinds enable row level security;
grant select,insert,update,delete on public.brand_product_kinds to authenticated;
drop policy if exists brand_product_kinds_staff_all on public.brand_product_kinds;
create policy brand_product_kinds_staff_all on public.brand_product_kinds for all to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));

alter table public.entity_source_links drop constraint if exists entity_source_links_entity_table_check;
alter table public.entity_source_links add constraint entity_source_links_entity_table_check
check (entity_table in ('organizations','locations','brands','products','offers','contents'));

create or replace function public.admin_create_brand_draft(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_brand_id uuid := gen_random_uuid();
  v_source_id uuid := gen_random_uuid();
  v_kind text := trim(coalesce(p_payload->>'product_kind',''));
  v_source_type text := coalesce(nullif(p_payload->>'source_type',''),'organization');
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then raise exception 'admin_required' using errcode='42501'; end if;
  if length(trim(coalesce(p_payload->>'name_ar',''))) < 2 then raise exception 'invalid_brand'; end if;
  if v_kind not in ('roasted_coffee','equipment','consumable','care_product','replacement_part') then raise exception 'invalid_product_kind'; end if;
  if length(trim(coalesce(p_payload->>'source_label',''))) < 3 then raise exception 'source_required'; end if;
  if v_source_type not in ('manufacturer','official_registry','organization','seller','government','professional_body','research','editorial','other') then raise exception 'invalid_source_type'; end if;

  insert into public.source_records(id,source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt,created_by)
  values(v_source_id,'SRC-BRAND-'||upper(substr(replace(v_brand_id::text,'-',''),1,16)),trim(p_payload->>'source_label'),v_source_type,
    nullif(trim(p_payload->>'source_url'),''),trim(p_payload->>'source_label'),now(),'Facts entered by platform staff; no media copied',nullif(trim(p_payload->>'evidence_note'),''),v_actor);

  insert into public.brands(id,slug,name_ar,name_en,website_url,status)
  values(v_brand_id,'brand-'||substr(replace(v_brand_id::text,'-',''),1,16),trim(p_payload->>'name_ar'),nullif(trim(p_payload->>'name_en'),''),nullif(trim(p_payload->>'website_url'),''),'draft');
  insert into public.brand_product_kinds(brand_id,product_kind) values(v_brand_id,v_kind);
  insert into public.entity_source_links(entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
  values('brands',v_brand_id,v_source_id,array['identity','product_kind','website'],true,v_actor);
  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,after_data,source)
  values(v_actor,'create_brand_draft','brands',v_brand_id::text,p_payload,'operations_center_v3');
  return jsonb_build_object('entity_type','brand','id',v_brand_id,'status','draft');
end;
$$;

revoke all on function public.admin_create_brand_draft(jsonb) from public,anon;
grant execute on function public.admin_create_brand_draft(jsonb) to authenticated;

commit;
