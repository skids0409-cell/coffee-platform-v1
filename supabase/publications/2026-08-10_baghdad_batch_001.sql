-- APPLIED 2026-08-10 AFTER EXPLICIT OWNER APPROVAL.
-- Coffee Platform V1 — first verified Baghdad publication batch
-- Verified on 2026-08-10 against the organizations' official websites and
-- the DF Grinders product page. Records with high/critical open issues remain
-- in review. Offers remain in review until their seller records are publishable.

begin;

with eligible_organizations as (
  select o.id
  from public.organizations o
  where o.slug in (
    'locus-coffee-iraq',
    'mr-kims-cafe',
    'nespresso-iraq',
    'ridha-alwan-coffee',
    'sumer-land'
  )
  and o.status = 'in_review'
  and o.verification_tier <> 't1_unverified'
  and exists (select 1 from public.organization_roles r where r.organization_id = o.id)
  and exists (select 1 from public.locations l where l.organization_id = o.id and l.status <> 'archived')
  and exists (
    select 1 from public.entity_source_links e
    where e.entity_table = 'organizations' and e.entity_id = o.id
  )
  and not exists (
    select 1 from public.data_quality_issues q
    where q.entity_table = 'organizations'
      and q.entity_id = o.id
      and q.status = 'open'
      and q.severity in ('high', 'critical')
  )
), organization_before as (
  select o.id, o.status
  from public.organizations o
  join eligible_organizations e on e.id = o.id
), published_organizations as (
  update public.organizations o
  set status = 'published',
      source_checked_at = '2026-08-10 00:00:00+00',
      published_at = coalesce(o.published_at, now()),
      updated_at = now()
  from eligible_organizations e
  where o.id = e.id
  returning o.id
), published_locations as (
  update public.locations l
  set status = 'published', updated_at = now()
  from published_organizations p
  where l.organization_id = p.id and l.status = 'in_review'
  returning l.id, l.organization_id
)
insert into public.audit_events (
  actor_user_id, action, entity_table, entity_id,
  before_data, after_data, source
)
select (
         select p.id from public.profiles p
         where p.role = 'admin' and p.is_active = true
         order by p.created_at asc limit 1
       ),
       'publish_verified_baghdad_organization_batch_001',
       'organizations',
       b.id::text,
       jsonb_build_object('status', b.status),
       jsonb_build_object(
         'status', 'published',
         'source_checked_at', '2026-08-10',
         'published_locations', (
           select count(*) from published_locations l where l.organization_id = b.id
         )
       ),
       'migration_014'
from organization_before b
where exists (select 1 from published_organizations p where p.id = b.id);

with eligible_products as (
  select p.id
  from public.products p
  where p.slug = 'df54-v4-coffee-grinder'
    and p.status = 'in_review'
    and p.verification_tier <> 't1_unverified'
    and exists (select 1 from public.product_categories c where c.product_id = p.id and c.is_primary = true)
    and exists (select 1 from public.product_attribute_values a where a.product_id = p.id)
    and exists (
      select 1 from public.entity_source_links e
      where e.entity_table = 'products' and e.entity_id = p.id
    )
    and not exists (
      select 1 from public.data_quality_issues q
      where q.entity_table = 'products'
        and q.entity_id = p.id
        and q.status = 'open'
        and q.severity in ('high', 'critical')
    )
), product_before as (
  select p.id, p.status from public.products p join eligible_products e on e.id = p.id
), published_products as (
  update public.products p
  set status = 'published',
      source_checked_at = '2026-08-10 00:00:00+00',
      published_at = coalesce(p.published_at, now()),
      updated_at = now()
  from eligible_products e
  where p.id = e.id
  returning p.id
)
insert into public.audit_events (
  actor_user_id, action, entity_table, entity_id,
  before_data, after_data, source
)
select (
         select p.id from public.profiles p
         where p.role = 'admin' and p.is_active = true
         order by p.created_at asc limit 1
       ),
       'publish_verified_baghdad_product_batch_001',
       'products',
       b.id::text,
       jsonb_build_object('status', b.status),
       jsonb_build_object('status', 'published', 'source_checked_at', '2026-08-10'),
       'migration_014'
from product_before b
where exists (select 1 from published_products p where p.id = b.id);

update public.source_records
set accessed_at = '2026-08-10 00:00:00+00'
where source_key in (
  'SRC-BGD-001', 'SRC-BGD-002', 'SRC-BGD-004', 'SRC-BGD-007',
  'SRC-BGD-008', 'SRC-PRD-001', 'SRC-PRD-002'
);

commit;

select
  (select count(*) from public.organizations where slug in (
    'locus-coffee-iraq','mr-kims-cafe','nespresso-iraq','ridha-alwan-coffee','sumer-land'
  ) and status = 'published') as published_organizations,
  (select count(*) from public.locations l join public.organizations o on o.id=l.organization_id
   where o.slug in ('locus-coffee-iraq','mr-kims-cafe','nespresso-iraq','ridha-alwan-coffee','sumer-land')
   and l.status = 'published') as published_locations,
  (select count(*) from public.products where slug='df54-v4-coffee-grinder' and status='published') as published_products,
  (select count(*) from public.offers where status='published') as published_offers;
