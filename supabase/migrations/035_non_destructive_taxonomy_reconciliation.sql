begin;

-- Migration 035: reconcile only the navigation/filter projection.
-- Canonical identity and history are immutable in this migration:
--   * no INSERT / DELETE
--   * no update to categories.id or categories.parent_id
--   * no update to product_categories

do $$
begin
  if (select count(*) from public.categories) <> 59 then
    raise exception 'taxonomy_preflight_count_mismatch expected=59 actual=%',
      (select count(*) from public.categories);
  end if;

  if exists (
    select 1
    from step1_backup_20260825_pre031.categories as historical
    where not exists (
      select 1 from public.categories as current
      where current.code = historical.code
    )
  ) then
    raise exception 'taxonomy_preflight_historical_record_missing';
  end if;
end
$$;

-- Every selectable equipment record is projected directly below one of the
-- five public families. The canonical parent_id hierarchy remains untouched.
-- catalog_filter_id groups fine-grained records under a stable public filter.
with mapping(category_code, family_code, filter_code, product_kind, nav_order) as (
  values
    ('EQP-GRD-MAN','EQP-GRD','EQP-GRD-MAN','equipment',10),
    ('EQP-GRD-ELE','EQP-GRD','EQP-GRD-ELE','equipment',20),

    ('EQP-BRW-DRP','EQP-BRW','EQP-BRW-DRP','equipment',10),
    ('EQP-BRW-INT','EQP-BRW','EQP-BRW-DRP','equipment',11),
    ('EQP-BRW-PHN','EQP-BRW','EQP-BRW-DRP','equipment',12),
    ('EQP-BRW-SIF','EQP-BRW','EQP-BRW-DRP','equipment',13),
    ('EQP-BRW-IBR','EQP-BRW','EQP-BRW-IBR','equipment',20),
    ('EQP-BRW-FRP','EQP-BRW','EQP-BRW-FRP','equipment',30),
    ('EQP-BRW-MOK','EQP-BRW','EQP-BRW-MOK','equipment',40),
    ('EQP-BRW-CLD','EQP-BRW','EQP-BRW-CLD','equipment',50),
    ('EQP-BRW-PRS','EQP-BRW','EQP-BRW-PRS','equipment',60),
    ('EQP-BRW-SYP','EQP-BRW','EQP-BRW-SYP','equipment',70),

    ('EQP-ESP','EQP-BRW','EQP-ESP','equipment',80),
    ('EQP-ESP-DSG','EQP-BRW','EQP-ESP','equipment',81),
    ('EQP-ESP-DST','EQP-BRW','EQP-ESP','equipment',82),
    ('EQP-ESP-KBX','EQP-BRW','EQP-ESP','equipment',83),
    ('EQP-ESP-MAT','EQP-BRW','EQP-ESP','equipment',84),
    ('EQP-ESP-MIL','EQP-BRW','EQP-ESP','equipment',85),
    ('EQP-ESP-MIR','EQP-BRW','EQP-ESP','equipment',86),
    ('EQP-ESP-PCK','EQP-BRW','EQP-ESP','equipment',87),
    ('EQP-ESP-PRT','EQP-BRW','EQP-ESP','equipment',88),
    ('EQP-ESP-TMP','EQP-BRW','EQP-ESP','equipment',89),
    ('EQP-ESP-WDT','EQP-BRW','EQP-ESP','equipment',90),

    ('EQP-KET','EQP-BRW','EQP-KET','equipment',100),
    ('EQP-KET-ELE','EQP-BRW','EQP-KET','equipment',101),
    ('EQP-KET-STV','EQP-BRW','EQP-KET','equipment',102),
    ('EQP-MSR','EQP-BRW','EQP-MSR','equipment',110),
    ('EQP-MSR-SCL','EQP-BRW','EQP-MSR','equipment',111),
    ('EQP-MSR-REF','EQP-BRW','EQP-MSR','equipment',112),
    ('EQP-MSR-THM','EQP-BRW','EQP-MSR','equipment',113),
    ('EQP-FIL','EQP-BRW','EQP-FIL','consumable',120),
    ('EQP-FIL-CAP','EQP-BRW','EQP-FIL','consumable',121),
    ('EQP-FIL-CLT','EQP-BRW','EQP-FIL','consumable',122),
    ('EQP-FIL-MET','EQP-BRW','EQP-FIL','consumable',123),
    ('EQP-FIL-PAP','EQP-BRW','EQP-FIL','consumable',124),
    ('EQP-SRV','EQP-BRW','EQP-SRV','equipment',130),
    ('EQP-SRV-SRV','EQP-BRW','EQP-SRV','equipment',131),
    ('EQP-SRV-THM','EQP-BRW','EQP-SRV','equipment',132),

    ('EQP-MCH-ESP','EQP-MCH','EQP-MCH-ESP','equipment',10),
    ('EQP-MCH-FLT','EQP-MCH','EQP-MCH-FLT','equipment',20),
    ('EQP-MCH-CAP','EQP-MCH','EQP-MCH-CAP','equipment',30),
    ('EQP-MCH-TRK','EQP-MCH','EQP-MCH-TRK','equipment',40),

    ('EQP-ROA-HOM','EQP-ROA','EQP-ROA-HOM','equipment',10),
    ('EQP-ROA-COM','EQP-ROA','EQP-ROA-COM','equipment',20),
    ('EQP-ROA-SMP','EQP-ROA','EQP-ROA-SMP','equipment',30),

    ('EQP-WCS-WAT','EQP-WCS','EQP-WCS-WAT','care_product',10),
    ('EQP-WCS-CLN','EQP-WCS','EQP-WCS-CLN','care_product',20),
    ('EQP-WCS-PRT','EQP-WCS','EQP-WCS-PRT','replacement_part',30),
    ('EQP-WCS-ORG','EQP-WCS','EQP-WCS-ORG','care_product',40),
    ('EQP-WCS-STR','EQP-WCS','EQP-WCS-STR','care_product',50)
)
update public.categories as category
set navigation_parent_id = family.id,
    is_navigation_visible = true,
    catalog_family_id = family.id,
    catalog_filter_id = filter_node.id,
    catalog_product_kind = mapping.product_kind,
    sort_order = mapping.nav_order,
    updated_at = now()
from mapping
join public.categories as family on family.code = mapping.family_code
join public.categories as filter_node on filter_node.code = mapping.filter_code
where category.code = mapping.category_code;

do $$
declare
  v_selectable_count integer;
  v_hidden_count integer;
  v_missing_filter_count integer;
  v_missing_family_count integer;
  v_published_product_gap_count integer;
begin
  select count(*) into v_selectable_count
  from public.categories as c
  where c.code like 'EQP-%'
    and c.code not in ('EQP-GRD','EQP-BRW','EQP-MCH','EQP-ROA','EQP-WCS');

  select count(*) into v_hidden_count
  from public.categories as c
  where c.code like 'EQP-%'
    and c.code not in ('EQP-GRD','EQP-BRW','EQP-MCH','EQP-ROA','EQP-WCS')
    and not c.is_navigation_visible;

  select count(*) into v_missing_filter_count
  from public.categories as c
  where c.code like 'EQP-%'
    and c.code not in ('EQP-GRD','EQP-BRW','EQP-MCH','EQP-ROA','EQP-WCS')
    and c.catalog_filter_id is null;

  select count(*) into v_missing_family_count
  from public.categories as c
  where c.code like 'EQP-%'
    and c.code not in ('EQP-GRD','EQP-BRW','EQP-MCH','EQP-ROA','EQP-WCS')
    and c.catalog_family_id is null;

  with primary_category as (
    select distinct on (pc.product_id) pc.product_id, pc.category_id
    from public.product_categories as pc
    order by pc.product_id, pc.is_primary desc, pc.created_at
  )
  select count(*) into v_published_product_gap_count
  from public.products as p
  join primary_category as pc on pc.product_id = p.id
  join public.categories as c on c.id = pc.category_id
  where p.status = 'published'
    and c.code like 'EQP%'
    and (c.catalog_family_id is null or c.catalog_filter_id is null);

  if (select count(*) from public.categories) <> 59 then
    raise exception 'taxonomy_postflight_count_mismatch';
  end if;
  if v_selectable_count <> 50 then
    raise exception 'taxonomy_selectable_count_mismatch expected=50 actual=%', v_selectable_count;
  end if;
  if v_hidden_count <> 0 or v_missing_filter_count <> 0 or v_missing_family_count <> 0 then
    raise exception
      'taxonomy_projection_gap hidden=% missing_filter=% missing_family=%',
      v_hidden_count, v_missing_filter_count, v_missing_family_count;
  end if;
  if v_published_product_gap_count <> 0 then
    raise exception 'published_equipment_projection_gap count=%', v_published_product_gap_count;
  end if;

  if exists (
    select 1
    from public.categories as c
    join public.categories as filter_node on filter_node.id = c.catalog_filter_id
    where c.code in (
      'EQP-BRW-IBR','EQP-BRW-FRP','EQP-BRW-MOK',
      'EQP-BRW-CLD','EQP-BRW-PRS','EQP-BRW-SYP'
    )
      and filter_node.code = 'EQP-BRW-DRP'
  ) then
    raise exception 'manual_brewing_overcluster_remains';
  end if;

  if not exists (
    select 1
    from public.categories as wdt
    join public.categories as family on family.id = wdt.navigation_parent_id
    join public.categories as filter_node on filter_node.id = wdt.catalog_filter_id
    where wdt.code = 'EQP-ESP-WDT'
      and family.code = 'EQP-BRW'
      and filter_node.code = 'EQP-ESP'
      and wdt.is_navigation_visible
  ) then
    raise exception 'wdt_three_tier_projection_missing';
  end if;

  if exists (
    select 1
    from step1_backup_20260825_pre031.categories as historical
    where not exists (
      select 1 from public.categories as current
      where current.code = historical.code
    )
  ) then
    raise exception 'taxonomy_postflight_historical_record_missing';
  end if;
end
$$;

commit;

