-- Coffee Platform V1 — catalog governance, media and clean queue semantics
-- Version: 1.0.0 | Date: 2026-08-19
begin;

-- Price and availability belong to a seller Offer, never to product master data.
delete from public.filter_definitions fd
using public.field_definitions f
where fd.field_definition_id=f.id and f.code in ('market_price','availability');

-- A grinder can be suitable for a range, but a required "brew method" is not
-- grinder identity. Compatibility can be modelled separately when sourced.
delete from public.filter_definitions fd
using public.field_definitions f, public.categories c
where fd.field_definition_id=f.id and fd.category_id=c.id
  and f.code='brew_methods' and c.code in ('EQP-GRD-ELE','EQP-GRD-MAN');

create table if not exists public.entity_media (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null check (entity_table in ('organizations','brands','products','offers','contents','origin_claims')),
  entity_id uuid not null,
  media_type text not null default 'image' check (media_type='image'),
  storage_path text not null unique,
  url text not null,
  alt_ar text not null check (length(trim(alt_ar)) >= 2),
  rights_note text not null check (length(trim(rights_note)) >= 3),
  source_record_id uuid references public.source_records(id) on delete set null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists entity_media_entity_idx on public.entity_media(entity_table,entity_id,sort_order);
create unique index if not exists entity_media_one_primary_idx on public.entity_media(entity_table,entity_id) where is_primary;
alter table public.entity_media enable row level security;
grant select,insert,update,delete on public.entity_media to authenticated;
drop policy if exists entity_media_staff_all on public.entity_media;
create policy entity_media_staff_all on public.entity_media for all to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));

create or replace function public.admin_delete_catalog_record(p_entity_table text,p_entity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_label text;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if p_entity_table not in ('organizations','brands','products','offers','contents','origin_claims') then raise exception 'unsupported_entity'; end if;

  if p_entity_table='products' then select status::text,name_ar into v_status,v_label from public.products where id=p_entity_id;
  elsif p_entity_table='brands' then select status::text,name_ar into v_status,v_label from public.brands where id=p_entity_id;
  elsif p_entity_table='organizations' then select status::text,name_ar into v_status,v_label from public.organizations where id=p_entity_id;
  elsif p_entity_table='offers' then select status::text,'عرض سعر' into v_status,v_label from public.offers where id=p_entity_id;
  elsif p_entity_table='contents' then select status::text,title_ar into v_status,v_label from public.contents where id=p_entity_id;
  else select status::text,'مصدر قهوة' into v_status,v_label from public.origin_claims where id=p_entity_id;
  end if;
  if v_status is null then raise exception 'record_not_found'; end if;
  if v_status='published' then raise exception 'published_record_cannot_be_deleted'; end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,source)
  values(v_actor,'permanently_delete_nonpublished_record',p_entity_table,p_entity_id::text,jsonb_build_object('label',v_label,'status',v_status),'operations_center_v5');
  delete from public.entity_media where entity_table=p_entity_table and entity_id=p_entity_id;
  delete from public.entity_source_links where entity_table=p_entity_table and entity_id=p_entity_id;
  if p_entity_table='products' then delete from public.products where id=p_entity_id;
  elsif p_entity_table='brands' then delete from public.brands where id=p_entity_id;
  elsif p_entity_table='organizations' then delete from public.organizations where id=p_entity_id;
  elsif p_entity_table='offers' then delete from public.offers where id=p_entity_id;
  elsif p_entity_table='contents' then delete from public.contents where id=p_entity_id;
  else delete from public.origin_claims where id=p_entity_id;
  end if;
  return jsonb_build_object('deleted',true,'entity_table',p_entity_table,'id',p_entity_id);
end;
$$;
revoke all on function public.admin_delete_catalog_record(text,uuid) from public,anon;
grant execute on function public.admin_delete_catalog_record(text,uuid) to authenticated;

commit;
