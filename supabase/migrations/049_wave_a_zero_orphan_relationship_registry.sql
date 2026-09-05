-- Wave A / Phase 3 — Zero-Orphan Referential Integrity
begin;

create table if not exists public.governed_relationship_registry (
  relationship_code text primary key,
  storage_relation text not null,
  source_kind text not null,
  target_kind text not null,
  polymorphic boolean not null default false,
  protected_on_target_delete boolean not null default true,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.governed_relationship_registry enable row level security;
revoke all on public.governed_relationship_registry from anon, authenticated;
grant select on public.governed_relationship_registry to authenticated;
drop policy if exists governed_relationship_registry_staff_read on public.governed_relationship_registry;
create policy governed_relationship_registry_staff_read on public.governed_relationship_registry
for select to authenticated using ((select private.is_staff()));

insert into public.governed_relationship_registry(relationship_code,storage_relation,source_kind,target_kind,polymorphic,protected_on_target_delete,description) values
('entity_source_link','entity_source_links','source_record','governed_target',true,true,'Evidence/provenance link from a governed target to a source record.'),
('entity_media_link','entity_media','media_asset','governed_target',true,true,'Legacy-compatible governed media attachment to an entity target.'),
('media_asset_link','media_asset_links','media_asset','governed_target',true,true,'Canonical DAM link between an asset and an entity target.'),
('offer_product','offers','offer','product',false,true,'Seller offer belongs to a product.'),
('offer_seller','offers','offer','organization',false,true,'Seller offer belongs to a seller organization.'),
('origin_product','origin_claims','origin_claim','product',false,true,'Origin claim belongs to a product.'),
('product_category','product_categories','product','category',false,true,'Product classification relationship.'),
('product_attribute','product_attribute_values','product','field_definition',false,true,'Product governed attribute value relationship.')
on conflict (relationship_code) do update set
 storage_relation=excluded.storage_relation,
 source_kind=excluded.source_kind,
 target_kind=excluded.target_kind,
 polymorphic=excluded.polymorphic,
 protected_on_target_delete=excluded.protected_on_target_delete,
 description=excluded.description;

create or replace function private.governed_target_exists(p_target_table text,p_target_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path=''
as $$
begin
  if p_target_table='organizations' then return exists(select 1 from public.organizations where id=p_target_id);
  elsif p_target_table='brands' then return exists(select 1 from public.brands where id=p_target_id);
  elsif p_target_table='products' then return exists(select 1 from public.products where id=p_target_id);
  elsif p_target_table='offers' then return exists(select 1 from public.offers where id=p_target_id);
  elsif p_target_table='contents' then return exists(select 1 from public.contents where id=p_target_id);
  elsif p_target_table='origin_claims' then return exists(select 1 from public.origin_claims where id=p_target_id);
  elsif p_target_table='locations' then return exists(select 1 from public.locations where id=p_target_id);
  end if;
  return false;
end $$;
revoke all on function private.governed_target_exists(text,uuid) from public,anon,authenticated;

create or replace function private.media_target_exists(p_entity_type text,p_entity_id uuid)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$ select private.governed_target_exists(p_entity_type,p_entity_id) $$;
revoke all on function private.media_target_exists(text,uuid) from public,anon,authenticated;

create or replace function private.assert_polymorphic_governed_target()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_table text;
  v_id uuid;
begin
  if tg_table_name='media_asset_links' then
    v_table:=new.entity_type; v_id:=new.entity_id;
  else
    v_table:=new.entity_table; v_id:=new.entity_id;
  end if;
  if not private.governed_target_exists(v_table,v_id) then
    raise exception 'governed_relationship_target_missing' using errcode='23503';
  end if;
  return new;
end $$;
revoke all on function private.assert_polymorphic_governed_target() from public,anon,authenticated;

drop trigger if exists entity_source_links_target_guard on public.entity_source_links;
create trigger entity_source_links_target_guard
before insert or update of entity_table,entity_id on public.entity_source_links
for each row execute function private.assert_polymorphic_governed_target();

drop trigger if exists trg_entity_media_target_integrity on public.entity_media;
create trigger trg_entity_media_target_integrity
before insert or update of entity_table,entity_id on public.entity_media
for each row execute function private.assert_polymorphic_governed_target();

-- Keep the existing media-specific active-link guard; its target existence check now delegates to the canonical validator.

create or replace function private.block_polymorphic_target_delete()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if exists(select 1 from public.entity_source_links where entity_table=tg_table_name and entity_id=old.id)
     or exists(select 1 from public.entity_media where entity_table=tg_table_name and entity_id=old.id)
     or exists(select 1 from public.media_asset_links where entity_type=tg_table_name and entity_id=old.id)
  then
    raise exception 'governed_target_has_protected_relationships' using errcode='23503';
  end if;
  return old;
end $$;
revoke all on function private.block_polymorphic_target_delete() from public,anon,authenticated;

do $$
declare t text;
begin
  foreach t in array array['organizations','brands','products','offers','contents','origin_claims','locations'] loop
    execute format('drop trigger if exists governed_target_delete_guard on public.%I',t);
    execute format('create trigger governed_target_delete_guard before delete on public.%I for each row execute function private.block_polymorphic_target_delete()',t);
  end loop;
end $$;

create or replace view public.governed_relationship_integrity
with (security_invoker=true)
as
select 'entity_source_links'::text relationship_relation, l.id::text relationship_id, l.entity_table target_table, l.entity_id target_id,
       private.governed_target_exists(l.entity_table,l.entity_id) target_exists,
       exists(select 1 from public.source_records s where s.id=l.source_record_id) source_exists
from public.entity_source_links l
union all
select 'entity_media', l.id::text, l.entity_table, l.entity_id,
       private.governed_target_exists(l.entity_table,l.entity_id),
       exists(select 1 from public.media_assets a where a.id=l.asset_id)
from public.entity_media l
union all
select 'media_asset_links', l.id::text, l.entity_type, l.entity_id,
       private.governed_target_exists(l.entity_type,l.entity_id),
       exists(select 1 from public.media_assets a where a.id=l.asset_id)
from public.media_asset_links l;

revoke all on public.governed_relationship_integrity from anon,authenticated;
grant select on public.governed_relationship_integrity to authenticated;

commit;
