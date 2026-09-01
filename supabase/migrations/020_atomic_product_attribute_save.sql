-- Coffee Platform V1 — atomic replacement of category-scoped product attributes
-- Version: 1.0.0 | Date: 2026-08-19
begin;

create or replace function public.admin_replace_product_attributes(p_product_id uuid, p_values jsonb)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  if not exists (select 1 from public.products where id=p_product_id) then
    raise exception 'product_not_found';
  end if;

  -- The delete and insert are one database transaction. A bad value rolls the
  -- whole operation back, so a failed save can never leave half the specs lost.
  delete from public.product_attribute_values where product_id=p_product_id;
  insert into public.product_attribute_values(
    product_id,field_definition_id,value_text,value_integer,value_decimal,
    value_boolean,value_date,value_json,unit_code,source_record_id,observed_at
  )
  select p_product_id,x.field_definition_id,x.value_text,x.value_integer,x.value_decimal,
    x.value_boolean,x.value_date,x.value_json,x.unit_code,x.source_record_id,
    coalesce(x.observed_at,now())
  from jsonb_to_recordset(coalesce(p_values,'[]'::jsonb)) as x(
    field_definition_id uuid,value_text text,value_integer bigint,value_decimal numeric,
    value_boolean boolean,value_date date,value_json jsonb,unit_code text,
    source_record_id uuid,observed_at timestamptz
  );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_replace_product_attributes(uuid,jsonb) from public,anon;
grant execute on function public.admin_replace_product_attributes(uuid,jsonb) to authenticated;

commit;
