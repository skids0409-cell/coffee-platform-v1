with seed(field_code, operator, sort_order, is_visible, is_required_for_publish) as (
  values
    ('market_price'::text, 'range'::text, 90, true, false),
    ('availability'::text, 'equals'::text, 91, true, false)
)
insert into public.filter_definitions (
  category_id, field_definition_id, operator, sort_order,
  is_visible, is_required_for_publish, status
)
select c.id, f.id, s.operator, s.sort_order, s.is_visible,
       s.is_required_for_publish, 'published'::public.publication_status
from seed s
join public.categories c on c.code='EQP-MCH-FLT'
join public.field_definitions f on f.code=s.field_code
on conflict (category_id,field_definition_id) do update
set operator=excluded.operator, sort_order=excluded.sort_order,
    is_visible=excluded.is_visible,
    is_required_for_publish=excluded.is_required_for_publish,
    status=excluded.status;
