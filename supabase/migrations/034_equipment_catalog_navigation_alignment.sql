begin;

alter table public.categories
  add column navigation_parent_id uuid references public.categories(id) on delete restrict,
  add column is_navigation_visible boolean not null default false,
  add column catalog_family_id uuid references public.categories(id) on delete restrict,
  add column catalog_filter_id uuid references public.categories(id) on delete restrict,
  add column catalog_product_kind text,
  add constraint categories_navigation_parent_not_self_check
    check (navigation_parent_id is null or navigation_parent_id <> id),
  add constraint categories_catalog_product_kind_check
    check (
      catalog_product_kind is null or catalog_product_kind in (
        'roasted_coffee', 'equipment', 'consumable',
        'care_product', 'replacement_part'
      )
    );

comment on column public.categories.navigation_parent_id is
  'System-managed parent for the two-tier catalog/admin navigation tree; independent from the canonical taxonomy parent_id.';
comment on column public.categories.is_navigation_visible is
  'System-managed visibility flag for catalog and Operations selectors.';
comment on column public.categories.catalog_family_id is
  'System-managed primary catalog family used to include technical categories in a family listing.';
comment on column public.categories.catalog_filter_id is
  'System-managed visible filter node used to classify technical leaf categories without changing canonical parent_id.';
comment on column public.categories.catalog_product_kind is
  'System-managed product kind selected by Operations when a visible leaf is chosen.';

-- Preserve the existing non-equipment navigation while moving equipment to a
-- governed projection. New categories remain hidden until explicitly mapped.
update public.categories
set navigation_parent_id = parent_id,
    is_navigation_visible = true
where code <> 'EQP'
  and code not like 'EQP-%';

update public.categories
set navigation_parent_id = null,
    is_navigation_visible = false,
    catalog_family_id = null,
    catalog_filter_id = null,
    catalog_product_kind = null
where code = 'EQP'
   or code like 'EQP-%';

-- Two missing V1 navigation leaves are additive. No canonical category or
-- product-category relationship is deleted or rewritten.
insert into public.categories (
  code, parent_id, slug, name_ar, name_en, description_ar, description_en,
  sort_order, comparison_group, phase, is_filterable, status
)
select
  'EQP-WCS-PRT', parent.id, 'maintenance-parts', 'قطع الصيانة',
  'Maintenance Parts', 'قطع صيانة واستبدال موثقة التوافق مع المعدات.',
  'Maintenance and replacement parts with declared equipment compatibility.',
  30, 'maintenance_parts', 'V1', true, 'published'
from public.categories as parent
where parent.code = 'EQP-WCS'
  and not exists (select 1 from public.categories where code = 'EQP-WCS-PRT');

insert into public.categories (
  code, parent_id, slug, name_ar, name_en, description_ar, description_en,
  sort_order, comparison_group, phase, is_filterable, status
)
select
  'EQP-WCS-ORG', parent.id, 'coffee-corner-organizers', 'منظمات ركن القهوة',
  'Coffee Corner Organizers', 'منظمات الأدوات والملحقات ومساحة التحضير.',
  'Organizers for coffee tools, accessories, and preparation spaces.',
  40, 'coffee_corner_organizers', 'V1', true, 'published'
from public.categories as parent
where parent.code = 'EQP-WCS'
  and not exists (select 1 from public.categories where code = 'EQP-WCS-ORG');

-- Canonical labels shown in both public catalog and Operations.
update public.categories
set name_ar = case code
      when 'EQP-GRD' then 'مطاحن القهوة'
      when 'EQP-BRW' then 'أدوات التحضير'
      when 'EQP-MCH' then 'مكائن التحضير'
      when 'EQP-WCS' then 'العناية والصيانة'
      when 'EQP-BRW-DRP' then 'أدوات التقطير'
      when 'EQP-MSR' then 'الموازين'
      when 'EQP-FIL' then 'الفلاتر'
      when 'EQP-SRV' then 'أوعية التقديم والموقتات'
      when 'EQP-MCH-ESP' then 'مكائن الإسبريسو'
      when 'EQP-MCH-FLT' then 'مكائن القهوة المقطرة'
      when 'EQP-MCH-CAP' then 'مكائن الكبسولات'
      when 'EQP-ROA-HOM' then 'مكائن تحميص منزلية'
      when 'EQP-ROA-COM' then 'مكائن تحميص تجارية'
      when 'EQP-ROA-SMP' then 'محامص عينات'
      when 'EQP-WCS-WAT' then 'معالجة المياه'
      when 'EQP-WCS-CLN' then 'مواد التنظيف'
      else name_ar
    end,
    name_en = case code
      when 'EQP-GRD' then 'Coffee Grinders'
      when 'EQP-BRW' then 'Brewing Tools'
      when 'EQP-MCH' then 'Brewing Machines'
      when 'EQP-WCS' then 'Care & Maintenance'
      when 'EQP-BRW-DRP' then 'Drippers'
      when 'EQP-MSR' then 'Scales'
      when 'EQP-FIL' then 'Filters'
      when 'EQP-SRV' then 'Servers & Timers'
      when 'EQP-MCH-ESP' then 'Espresso Machines'
      when 'EQP-MCH-FLT' then 'Filter Coffee Machines'
      when 'EQP-MCH-CAP' then 'Capsule Machines'
      when 'EQP-ROA-HOM' then 'Home Coffee Roasters'
      when 'EQP-ROA-COM' then 'Commercial Coffee Roasters'
      when 'EQP-ROA-SMP' then 'Sample Roasters'
      when 'EQP-WCS-WAT' then 'Water Treatment'
      when 'EQP-WCS-CLN' then 'Cleaning Products'
      else name_en
    end
where code in (
  'EQP-GRD','EQP-BRW','EQP-MCH','EQP-ROA','EQP-WCS',
  'EQP-BRW-DRP','EQP-MSR','EQP-FIL','EQP-SRV',
  'EQP-MCH-ESP','EQP-MCH-FLT','EQP-MCH-CAP',
  'EQP-ROA-HOM','EQP-ROA-COM','EQP-ROA-SMP',
  'EQP-WCS-WAT','EQP-WCS-CLN'
);

-- Root and exactly five visible equipment families.
update public.categories as category
set is_navigation_visible = true,
    navigation_parent_id = null
where category.code = 'EQP';

update public.categories as category
set is_navigation_visible = true,
    navigation_parent_id = root.id,
    catalog_family_id = category.id,
    catalog_product_kind = null,
    sort_order = mapping.sort_order
from public.categories as root,
     (values
       ('EQP-GRD', 10), ('EQP-BRW', 20), ('EQP-MCH', 30),
       ('EQP-ROA', 40), ('EQP-WCS', 50)
     ) as mapping(code, sort_order)
where root.code = 'EQP'
  and category.code = mapping.code;

-- Exact second-tier navigation leaves and their entry product kinds.
update public.categories as category
set is_navigation_visible = true,
    navigation_parent_id = family.id,
    catalog_family_id = family.id,
    catalog_filter_id = category.id,
    catalog_product_kind = mapping.product_kind,
    sort_order = mapping.sort_order
from public.categories as family,
     (values
       ('EQP-GRD-MAN','EQP-GRD',10,'equipment'),
       ('EQP-GRD-ELE','EQP-GRD',20,'equipment'),
       ('EQP-BRW-DRP','EQP-BRW',10,'equipment'),
       ('EQP-KET','EQP-BRW',20,'equipment'),
       ('EQP-MSR','EQP-BRW',30,'equipment'),
       ('EQP-FIL','EQP-BRW',40,'consumable'),
       ('EQP-SRV','EQP-BRW',50,'equipment'),
       ('EQP-MCH-ESP','EQP-MCH',10,'equipment'),
       ('EQP-MCH-FLT','EQP-MCH',20,'equipment'),
       ('EQP-MCH-CAP','EQP-MCH',30,'equipment'),
       ('EQP-ROA-HOM','EQP-ROA',10,'equipment'),
       ('EQP-ROA-COM','EQP-ROA',20,'equipment'),
       ('EQP-ROA-SMP','EQP-ROA',30,'equipment'),
       ('EQP-WCS-WAT','EQP-WCS',10,'care_product'),
       ('EQP-WCS-CLN','EQP-WCS',20,'care_product'),
       ('EQP-WCS-PRT','EQP-WCS',30,'replacement_part'),
       ('EQP-WCS-ORG','EQP-WCS',40,'care_product')
     ) as mapping(code, family_code, sort_order, product_kind)
where category.code = mapping.code
  and family.code = mapping.family_code;

-- Map technical categories to the stable public family/filter projection.
update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = filter.id
from public.categories as family,
     public.categories as filter
where family.code = 'EQP-BRW'
  and filter.code = 'EQP-BRW-DRP'
  and category.code like 'EQP-BRW-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = filter.id
from public.categories as family,
     public.categories as filter
where family.code = 'EQP-BRW'
  and filter.code = 'EQP-KET'
  and category.code like 'EQP-KET-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = case when category.code = 'EQP-MSR-SCL' then filter.id else null end
from public.categories as family,
     public.categories as filter
where family.code = 'EQP-BRW'
  and filter.code = 'EQP-MSR'
  and category.code like 'EQP-MSR-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = filter.id
from public.categories as family,
     public.categories as filter
where family.code = 'EQP-BRW'
  and filter.code = 'EQP-FIL'
  and category.code like 'EQP-FIL-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = filter.id
from public.categories as family,
     public.categories as filter
where family.code = 'EQP-BRW'
  and filter.code = 'EQP-SRV'
  and category.code like 'EQP-SRV-%';

update public.categories as category
set catalog_family_id = family.id
from public.categories as family
where family.code = 'EQP-BRW'
  and (category.code = 'EQP-ESP' or category.code like 'EQP-ESP-%');

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = case
      when category.code in ('EQP-MCH-ESP','EQP-MCH-FLT','EQP-MCH-CAP')
        then category.id
      else null
    end
from public.categories as family
where family.code = 'EQP-MCH'
  and category.code like 'EQP-MCH-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = case
      when category.code in ('EQP-ROA-HOM','EQP-ROA-COM','EQP-ROA-SMP')
        then category.id
      else null
    end
from public.categories as family
where family.code = 'EQP-ROA'
  and category.code like 'EQP-ROA-%';

update public.categories as category
set catalog_family_id = family.id,
    catalog_filter_id = case
      when category.code in ('EQP-WCS-WAT','EQP-WCS-CLN','EQP-WCS-PRT','EQP-WCS-ORG')
        then category.id
      else null
    end
from public.categories as family
where family.code = 'EQP-WCS'
  and category.code like 'EQP-WCS-%';

create index categories_navigation_parent_visible_idx
  on public.categories (navigation_parent_id, sort_order, code)
  where is_navigation_visible;
create index categories_catalog_family_idx
  on public.categories (catalog_family_id)
  where catalog_family_id is not null;
create index categories_catalog_filter_idx
  on public.categories (catalog_filter_id)
  where catalog_filter_id is not null;

create or replace function private.validate_category_navigation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_navigation_visible and new.navigation_parent_id is not null then
    if not exists (
      select 1 from public.categories as parent
      where parent.id = new.navigation_parent_id
        and parent.is_navigation_visible
    ) then
      raise exception 'visible_navigation_parent_required' using errcode = '23514';
    end if;

    if exists (
      with recursive ancestors as (
        select c.id, c.navigation_parent_id
        from public.categories as c
        where c.id = new.navigation_parent_id
        union all
        select c.id, c.navigation_parent_id
        from public.categories as c
        join ancestors as a on c.id = a.navigation_parent_id
      )
      select 1 from ancestors where id = new.id
    ) then
      raise exception 'category_navigation_cycle_detected' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

revoke all on function private.validate_category_navigation()
  from public, anon, authenticated;

create trigger validate_category_navigation
before insert or update of navigation_parent_id, is_navigation_visible
on public.categories
for each row execute function private.validate_category_navigation();

do $$
declare
  v_family_count integer;
  v_filter_count integer;
  v_bad_family_names integer;
begin
  select count(*) into v_family_count
  from public.categories as c
  join public.categories as root on root.id = c.navigation_parent_id
  where root.code = 'EQP' and c.is_navigation_visible;

  select count(*) into v_filter_count
  from public.categories as c
  join public.categories as family on family.id = c.navigation_parent_id
  join public.categories as root on root.id = family.navigation_parent_id
  where root.code = 'EQP' and c.is_navigation_visible;

  select count(*) into v_bad_family_names
  from (values
    ('EQP-GRD','مطاحن القهوة'), ('EQP-BRW','أدوات التحضير'),
    ('EQP-MCH','مكائن التحضير'), ('EQP-ROA','مكائن التحميص'),
    ('EQP-WCS','العناية والصيانة')
  ) as required(code, name_ar)
  left join public.categories as c
    on c.code = required.code
   and c.name_ar = required.name_ar
   and c.is_navigation_visible
  where c.id is null;

  if v_family_count <> 5 or v_filter_count <> 17 or v_bad_family_names <> 0 then
    raise exception
      'equipment_navigation_gate_failed families=% filters=% bad_names=%',
      v_family_count, v_filter_count, v_bad_family_names;
  end if;
end
$$;

commit;
