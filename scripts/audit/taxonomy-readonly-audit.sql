-- READ-ONLY TAXONOMY RECONCILIATION AUDIT
-- PostgreSQL 17 / Supabase. This file intentionally contains no DML or DDL.
-- Execute with ON_ERROR_STOP=1 and a transaction_read_only session.

begin transaction read only;

-- A. Physical model: taxonomy/subcategories are logical levels in the
-- self-referencing public.categories table; no separate live tables exist.
select table_schema, table_name, table_type
from information_schema.tables
where table_name in ('taxonomy', 'categories', 'subcategories')
order by table_schema, table_name;

-- B. Preservation against the immutable pre-031 backup snapshot.
with current_rows as (
  select c.code, c.name_ar, c.name_en, p.code as parent_code
  from public.categories c
  left join public.categories p on p.id = c.parent_id
), backup_rows as (
  select c.code, c.name_ar, c.name_en, p.code as parent_code
  from step1_backup_20260825_pre031.categories c
  left join step1_backup_20260825_pre031.categories p on p.id = c.parent_id
)
select
  (select count(*) from current_rows) as current_count,
  (select count(*) from backup_rows) as backup_count,
  (select count(*) from backup_rows b where not exists (select 1 from current_rows c where c.code = b.code)) as missing_since_backup,
  (select count(*) from current_rows c where not exists (select 1 from backup_rows b where b.code = c.code)) as added_since_backup;

-- C. Missing/added identities, without changing either side.
with current_rows as (select code from public.categories),
backup_rows as (select code from step1_backup_20260825_pre031.categories)
select 'missing_since_backup' as issue, b.code
from backup_rows b where not exists (select 1 from current_rows c where c.code = b.code)
union all
select 'added_since_backup', c.code
from current_rows c where not exists (select 1 from backup_rows b where b.code = c.code)
order by issue, code;

-- D. Canonical reachability, orphans and cycles/unreachable records.
with recursive reachable as (
  select id from public.categories where parent_id is null
  union
  select c.id from public.categories c join reachable r on c.parent_id = r.id
)
select c.code, c.name_ar,
  case
    when c.parent_id is not null and p.id is null then 'canonical_orphan'
    when r.id is null then 'cycle_or_unreachable'
  end as issue
from public.categories c
left join public.categories p on p.id = c.parent_id
left join reachable r on r.id = c.id
where (c.parent_id is not null and p.id is null) or r.id is null
order by c.code;

-- E. Exact canonical hierarchy and its non-destructive navigation projection.
with recursive hierarchy as (
  select id, code, name_ar, parent_id, 1 as level_no,
         name_ar::text as canonical_path
  from public.categories where parent_id is null
  union all
  select c.id, c.code, c.name_ar, c.parent_id, h.level_no + 1,
         h.canonical_path || ' ← ' || c.name_ar
  from public.categories c join hierarchy h on c.parent_id = h.id
)
select h.level_no, h.code, h.name_ar, h.canonical_path,
       c.is_navigation_visible,
       np.code as navigation_parent_code,
       cf.code as catalog_family_code,
       ff.code as catalog_filter_code
from hierarchy h
join public.categories c on c.id = h.id
left join public.categories np on np.id = c.navigation_parent_id
left join public.categories cf on cf.id = c.catalog_family_id
left join public.categories ff on ff.id = c.catalog_filter_id
order by h.canonical_path;

-- F. Reconciliation blockers: granular equipment entries hidden from all
-- current two-tier Operations selectors or missing a public catalog filter.
with recursive depth as (
  select id, 1 as level_no from public.categories where parent_id is null
  union all
  select c.id, d.level_no + 1 from public.categories c join depth d on c.parent_id = d.id
)
select c.code, c.name_ar, d.level_no,
       case
         when not c.is_navigation_visible and c.catalog_filter_id is null
           then 'hidden_in_operations_and_missing_catalog_filter'
         when not c.is_navigation_visible
           then 'hidden_in_operations'
         when c.catalog_filter_id is null
           then 'missing_catalog_filter'
       end as issue,
       cf.code as catalog_family_code,
       ff.code as catalog_filter_code
from public.categories c
join depth d on d.id = c.id
left join public.categories cf on cf.id = c.catalog_family_id
left join public.categories ff on ff.id = c.catalog_filter_id
where c.code like 'EQP-%'
  and d.level_no >= 3
  and (not c.is_navigation_visible or c.catalog_filter_id is null)
order by c.code;

-- G. Published product parity blockers.
with primary_category as (
  select distinct on (pc.product_id) pc.product_id, pc.category_id
  from public.product_categories pc
  order by pc.product_id, pc.is_primary desc, pc.created_at
)
select p.id, p.slug, p.name_ar, c.code as assigned_category,
       cf.code as catalog_family_code, ff.code as catalog_filter_code,
       case
         when c.id is null then 'missing_primary_category'
         when c.code like 'EQP%' and cf.id is null then 'missing_catalog_family'
         when c.code like 'EQP%' and ff.id is null then 'missing_catalog_filter'
       end as issue
from public.products p
left join primary_category pc on pc.product_id = p.id
left join public.categories c on c.id = pc.category_id
left join public.categories cf on cf.id = c.catalog_family_id
left join public.categories ff on ff.id = c.catalog_filter_id
where p.status = 'published'
  and (c.id is null or (c.code like 'EQP%' and (cf.id is null or ff.id is null)))
order by p.slug;

rollback;
