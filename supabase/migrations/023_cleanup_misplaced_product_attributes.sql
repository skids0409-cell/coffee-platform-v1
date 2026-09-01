-- Remove values stored in product master data that belong to offers or were
-- incorrectly required for grinders. Offer rows remain untouched.
begin;
delete from public.product_attribute_values pav
using public.field_definitions f
where pav.field_definition_id=f.id and f.code in ('market_price','availability');

delete from public.product_attribute_values pav
using public.field_definitions f, public.product_categories pc, public.categories c
where pav.field_definition_id=f.id and pav.product_id=pc.product_id and pc.category_id=c.id
  and f.code='brew_methods' and c.code in ('EQP-GRD-ELE','EQP-GRD-MAN');
commit;
