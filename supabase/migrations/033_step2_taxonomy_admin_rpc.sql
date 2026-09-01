-- Coffee Platform V1 — STEP2 taxonomy administration RPC layer
-- Scope: atomic admin-only category, field, filter, lifecycle, and audit APIs.

begin;

create or replace function private.is_filter_operator_compatible(
  p_data_type public.attribute_data_type,
  p_operator text
)
returns boolean
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select case p_data_type
    when 'text' then p_operator in ('equals', 'contains', 'exists')
    when 'integer' then p_operator in ('range', 'equals', 'exists')
    when 'decimal' then p_operator in ('range', 'equals', 'exists')
    when 'date' then p_operator in ('range', 'equals', 'exists')
    when 'boolean' then p_operator in ('equals', 'exists')
    when 'enum' then p_operator in ('equals', 'exists')
    when 'multi_enum' then p_operator in ('in', 'contains', 'exists')
    when 'reference' then p_operator in ('equals', 'in', 'exists')
    when 'json' then p_operator in ('contains', 'in', 'exists')
    else false
  end;
$$;

revoke all on function private.is_filter_operator_compatible(
  public.attribute_data_type, text
) from public, anon;
grant execute on function private.is_filter_operator_compatible(
  public.attribute_data_type, text
) to authenticated;

create or replace function private.validate_taxonomy_field()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(new.allowed_values) <> 'array' then
    raise exception 'allowed_values_must_be_array' using errcode = '23514';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.allowed_values) as item(value)
    where jsonb_typeof(item.value) <> 'string'
       or btrim(item.value #>> '{}') = ''
  ) then
    raise exception 'allowed_values_must_contain_nonempty_strings'
      using errcode = '23514';
  end if;
  if (
    select count(*) <> count(distinct item.value #>> '{}')
    from jsonb_array_elements(new.allowed_values) as item(value)
  ) then
    raise exception 'allowed_values_must_be_unique' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if old.status = 'published'
       and (new.code is distinct from old.code
            or new.data_type is distinct from old.data_type) then
      raise exception 'published_field_identity_is_immutable'
        using errcode = '23514';
    end if;
    if old.status is distinct from new.status
       and not (
         (old.status = 'draft' and new.status in ('in_review', 'archived'))
         or (old.status = 'in_review' and new.status in ('draft', 'published', 'rejected'))
         or (old.status = 'published' and new.status = 'archived')
         or (old.status = 'rejected' and new.status in ('draft', 'archived'))
         or (old.status = 'archived' and new.status = 'draft')
       ) then
      raise exception 'invalid_field_status_transition:%->%',
        old.status, new.status using errcode = '23514';
    end if;
    if old.status = 'published' and new.status <> 'published'
       and exists (
         select 1 from public.filter_definitions as fd
         where fd.field_definition_id = new.id
           and fd.status = 'published'
       ) then
      raise exception 'published_filters_block_field_unpublish'
        using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;

revoke all on function private.validate_taxonomy_field()
  from public, anon, authenticated;

create trigger validate_taxonomy_field
before insert or update of code, data_type, allowed_values, status
on public.field_definitions
for each row execute function private.validate_taxonomy_field();

create or replace function private.validate_taxonomy_filter()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_field public.field_definitions%rowtype;
  v_category_status public.publication_status;
begin
  select * into v_field
  from public.field_definitions
  where id = new.field_definition_id;
  if not found then
    raise exception 'field_definition_not_found' using errcode = '23503';
  end if;
  if not private.is_filter_operator_compatible(v_field.data_type, new.operator) then
    raise exception 'filter_operator_incompatible:%:%',
      v_field.data_type, new.operator using errcode = '23514';
  end if;
  if new.is_required_for_publish and not new.is_visible then
    raise exception 'required_filter_must_be_visible' using errcode = '23514';
  end if;
  if new.status = 'published' then
    select status into v_category_status
    from public.categories where id = new.category_id;
    if v_category_status <> 'published' or v_field.status <> 'published' then
      raise exception 'published_filter_requires_published_category_and_field'
        using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE'
     and old.status is distinct from new.status
     and not (
       (old.status = 'draft' and new.status in ('in_review', 'archived'))
       or (old.status = 'in_review' and new.status in ('draft', 'published', 'rejected'))
       or (old.status = 'published' and new.status = 'archived')
       or (old.status = 'rejected' and new.status in ('draft', 'archived'))
       or (old.status = 'archived' and new.status = 'draft')
     ) then
    raise exception 'invalid_filter_status_transition:%->%',
      old.status, new.status using errcode = '23514';
  end if;
  return new;
end
$$;

revoke all on function private.validate_taxonomy_filter()
  from public, anon, authenticated;

create trigger validate_taxonomy_filter
before insert or update of field_definition_id, operator, is_visible,
  is_required_for_publish, status
on public.filter_definitions
for each row execute function private.validate_taxonomy_filter();

create or replace function public.admin_validate_taxonomy_change(
  p_operation text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_category_id uuid;
  v_filters jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_duplicate_count integer;
  v_missing_count integer;
  v_incompatible_count integer;
  v_hidden_required_count integer;
begin
  if auth.uid() is null
     or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_operation <> 'replace_category_filters' then
    raise exception 'unsupported_taxonomy_validation';
  end if;

  v_category_id := nullif(p_payload ->> 'category_id', '')::uuid;
  v_filters := coalesce(p_payload -> 'filters', '[]'::jsonb);
  if v_category_id is null
     or not exists (select 1 from public.categories where id = v_category_id)
     or jsonb_typeof(v_filters) <> 'array' then
    raise exception 'invalid_filter_payload' using errcode = '22023';
  end if;

  with rows as (
    select *
    from jsonb_to_recordset(v_filters) as x(
      field_definition_id uuid,
      operator text,
      sort_order integer,
      is_visible boolean,
      is_required_for_publish boolean
    )
  )
  select count(*) - count(distinct field_definition_id)
    into v_duplicate_count
  from rows;

  with rows as (
    select *
    from jsonb_to_recordset(v_filters) as x(
      field_definition_id uuid,
      operator text,
      sort_order integer,
      is_visible boolean,
      is_required_for_publish boolean
    )
  )
  select count(*) filter (where f.id is null),
         count(*) filter (
           where f.id is not null
             and not private.is_filter_operator_compatible(f.data_type, r.operator)
         ),
         count(*) filter (
           where coalesce(r.is_required_for_publish, false)
             and not coalesce(r.is_visible, true)
         )
    into v_missing_count, v_incompatible_count, v_hidden_required_count
  from rows as r
  left join public.field_definitions as f
    on f.id = r.field_definition_id;

  if v_duplicate_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('code', 'duplicate_fields', 'count', v_duplicate_count)
    );
  end if;
  if v_missing_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('code', 'missing_fields', 'count', v_missing_count)
    );
  end if;
  if v_incompatible_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('code', 'incompatible_operators', 'count', v_incompatible_count)
    );
  end if;
  if v_hidden_required_count > 0 then
    v_blockers := v_blockers || jsonb_build_array(
      jsonb_build_object('code', 'hidden_required_filters', 'count', v_hidden_required_count)
    );
  end if;

  return jsonb_build_object(
    'valid', jsonb_array_length(v_blockers) = 0,
    'blockers', v_blockers,
    'filter_count', jsonb_array_length(v_filters)
  );
end
$$;

create or replace function public.admin_upsert_category(
  p_category_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_after jsonb;
  v_id uuid := coalesce(p_category_id, gen_random_uuid());
  v_existing public.categories%rowtype;
  v_parent_id uuid := nullif(p_payload ->> 'parent_id', '')::uuid;
  v_phase text := coalesce(nullif(btrim(p_payload ->> 'phase'), ''), 'V1');
begin
  if v_actor is null
     or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('coffee_platform_taxonomy', 0)
  );
  if v_phase not in ('V1', 'Phase 2 Professional') then
    raise exception 'invalid_taxonomy_phase' using errcode = '22023';
  end if;
  if btrim(coalesce(p_payload ->> 'code', '')) !~ '^[A-Z0-9]+(?:-[A-Z0-9]+)*$'
     or btrim(coalesce(p_payload ->> 'slug', '')) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or length(btrim(coalesce(p_payload ->> 'name_ar', ''))) < 2
     or length(btrim(coalesce(p_payload ->> 'name_en', ''))) < 2 then
    raise exception 'invalid_category_payload' using errcode = '22023';
  end if;

  if p_category_id is null then
    insert into public.categories(
      id, code, parent_id, slug, name_ar, name_en,
      description_ar, description_en, sort_order, comparison_group,
      phase, is_filterable, status
    ) values (
      v_id,
      btrim(p_payload ->> 'code'),
      v_parent_id,
      btrim(p_payload ->> 'slug'),
      btrim(p_payload ->> 'name_ar'),
      btrim(p_payload ->> 'name_en'),
      nullif(btrim(p_payload ->> 'description_ar'), ''),
      nullif(btrim(p_payload ->> 'description_en'), ''),
      coalesce((p_payload ->> 'sort_order')::integer, 0),
      nullif(btrim(p_payload ->> 'comparison_group'), ''),
      v_phase,
      coalesce((p_payload ->> 'is_filterable')::boolean, true),
      'draft'
    );
  else
    select * into v_existing
    from public.categories where id = p_category_id for update;
    if not found then
      raise exception 'category_not_found' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is null
       or v_existing.updated_at <> p_expected_updated_at then
      raise exception 'taxonomy_version_conflict' using errcode = '40001';
    end if;
    v_before := to_jsonb(v_existing);
    update public.categories
    set code = btrim(p_payload ->> 'code'),
        parent_id = v_parent_id,
        slug = btrim(p_payload ->> 'slug'),
        name_ar = btrim(p_payload ->> 'name_ar'),
        name_en = btrim(p_payload ->> 'name_en'),
        description_ar = nullif(btrim(p_payload ->> 'description_ar'), ''),
        description_en = nullif(btrim(p_payload ->> 'description_en'), ''),
        sort_order = coalesce((p_payload ->> 'sort_order')::integer, 0),
        comparison_group = nullif(btrim(p_payload ->> 'comparison_group'), ''),
        phase = v_phase,
        is_filterable = coalesce((p_payload ->> 'is_filterable')::boolean, true)
    where id = p_category_id;
  end if;

  select to_jsonb(c) into v_after from public.categories as c where id = v_id;
  insert into public.audit_events(
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, source
  ) values (
    v_actor,
    case when p_category_id is null
      then 'taxonomy_create_category' else 'taxonomy_update_category' end,
    'categories', v_id::text, v_before, v_after, 'step2_taxonomy_admin'
  );
  return v_after;
end
$$;

create or replace function public.admin_upsert_field_definition(
  p_field_definition_id uuid,
  p_payload jsonb,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_after jsonb;
  v_id uuid := coalesce(p_field_definition_id, gen_random_uuid());
  v_existing public.field_definitions%rowtype;
  v_data_type public.attribute_data_type;
  v_allowed_values jsonb := coalesce(p_payload -> 'allowed_values', '[]'::jsonb);
  v_validation_rules jsonb := coalesce(p_payload -> 'validation_rules', '{}'::jsonb);
  v_missing_policy text := coalesce(
    nullif(p_payload ->> 'missing_value_policy', ''), 'hide'
  );
begin
  if v_actor is null
     or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('coffee_platform_taxonomy', 0)
  );
  begin
    v_data_type := (p_payload ->> 'data_type')::public.attribute_data_type;
  exception when invalid_text_representation then
    raise exception 'invalid_field_data_type' using errcode = '22023';
  end;
  if btrim(coalesce(p_payload ->> 'code', '')) !~ '^[a-z][a-z0-9_]*$'
     or length(btrim(coalesce(p_payload ->> 'name_ar', ''))) < 2
     or length(btrim(coalesce(p_payload ->> 'name_en', ''))) < 2
     or jsonb_typeof(v_allowed_values) <> 'array'
     or jsonb_typeof(v_validation_rules) <> 'object'
     or v_missing_policy not in (
       'block_publish', 'lower_confidence', 'show_unknown', 'hide'
     ) then
    raise exception 'invalid_field_payload' using errcode = '22023';
  end if;

  if p_field_definition_id is null then
    insert into public.field_definitions(
      id, code, name_ar, name_en, data_type, unit_code,
      allowed_values, validation_rules, missing_value_policy,
      is_searchable, is_comparable, is_recommendation_input,
      is_multi_value, status
    ) values (
      v_id,
      btrim(p_payload ->> 'code'),
      btrim(p_payload ->> 'name_ar'),
      btrim(p_payload ->> 'name_en'),
      v_data_type,
      nullif(btrim(p_payload ->> 'unit_code'), ''),
      v_allowed_values,
      v_validation_rules,
      v_missing_policy,
      coalesce((p_payload ->> 'is_searchable')::boolean, false),
      coalesce((p_payload ->> 'is_comparable')::boolean, false),
      coalesce((p_payload ->> 'is_recommendation_input')::boolean, false),
      case when v_data_type = 'multi_enum' then true
        else coalesce((p_payload ->> 'is_multi_value')::boolean, false) end,
      'draft'
    );
  else
    select * into v_existing
    from public.field_definitions
    where id = p_field_definition_id for update;
    if not found then
      raise exception 'field_definition_not_found' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is null
       or v_existing.updated_at <> p_expected_updated_at then
      raise exception 'taxonomy_version_conflict' using errcode = '40001';
    end if;
    v_before := to_jsonb(v_existing);
    update public.field_definitions
    set code = btrim(p_payload ->> 'code'),
        name_ar = btrim(p_payload ->> 'name_ar'),
        name_en = btrim(p_payload ->> 'name_en'),
        data_type = v_data_type,
        unit_code = nullif(btrim(p_payload ->> 'unit_code'), ''),
        allowed_values = v_allowed_values,
        validation_rules = v_validation_rules,
        missing_value_policy = v_missing_policy,
        is_searchable = coalesce((p_payload ->> 'is_searchable')::boolean, false),
        is_comparable = coalesce((p_payload ->> 'is_comparable')::boolean, false),
        is_recommendation_input = coalesce(
          (p_payload ->> 'is_recommendation_input')::boolean, false
        ),
        is_multi_value = case when v_data_type = 'multi_enum' then true
          else coalesce((p_payload ->> 'is_multi_value')::boolean, false) end
    where id = p_field_definition_id;
  end if;

  select to_jsonb(f) into v_after
  from public.field_definitions as f where id = v_id;
  insert into public.audit_events(
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, source
  ) values (
    v_actor,
    case when p_field_definition_id is null
      then 'taxonomy_create_field' else 'taxonomy_update_field' end,
    'field_definitions', v_id::text, v_before, v_after,
    'step2_taxonomy_admin'
  );
  return v_after;
end
$$;

create or replace function public.admin_replace_category_filters(
  p_category_id uuid,
  p_filters jsonb,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_category public.categories%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_validation jsonb;
  v_newly_required_missing integer;
begin
  if v_actor is null
     or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('coffee_platform_taxonomy', 0)
  );
  select * into v_category
  from public.categories where id = p_category_id for update;
  if not found then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;
  if p_expected_updated_at is null
     or v_category.updated_at <> p_expected_updated_at then
    raise exception 'taxonomy_version_conflict' using errcode = '40001';
  end if;

  v_validation := public.admin_validate_taxonomy_change(
    'replace_category_filters',
    jsonb_build_object('category_id', p_category_id, 'filters', p_filters)
  );
  if not (v_validation ->> 'valid')::boolean then
    raise exception 'invalid_category_filters:%', v_validation
      using errcode = '22023';
  end if;

  with submitted as (
    select *
    from jsonb_to_recordset(p_filters) as x(
      field_definition_id uuid,
      operator text,
      sort_order integer,
      is_visible boolean,
      is_required_for_publish boolean
    )
  ), newly_required as (
    select s.field_definition_id
    from submitted as s
    join public.field_definitions as f on f.id = s.field_definition_id
    left join public.filter_definitions as old
      on old.category_id = p_category_id
     and old.field_definition_id = s.field_definition_id
    where coalesce(s.is_required_for_publish, false)
      and not coalesce(old.is_required_for_publish, false)
      and f.validation_rules ->> 'storage_binding' = 'product_attribute_values'
  )
  select count(*) into v_newly_required_missing
  from public.products as p
  join public.product_categories as pc
    on pc.product_id = p.id and pc.category_id = p_category_id
  cross join newly_required as nr
  where p.status = 'published'
    and not exists (
      select 1 from public.product_attribute_values as pav
      where pav.product_id = p.id
        and pav.field_definition_id = nr.field_definition_id
    );

  if v_newly_required_missing > 0 then
    raise exception 'required_filter_missing_on_published_products:%',
      v_newly_required_missing using errcode = '23514';
  end if;

  select coalesce(jsonb_agg(to_jsonb(fd) order by fd.sort_order), '[]'::jsonb)
    into v_before
  from public.filter_definitions as fd
  where fd.category_id = p_category_id;

  delete from public.filter_definitions
  where category_id = p_category_id;

  insert into public.filter_definitions(
    category_id, field_definition_id, operator, sort_order,
    is_visible, is_required_for_publish, status
  )
  select p_category_id,
         x.field_definition_id,
         x.operator,
         coalesce(x.sort_order, 0),
         coalesce(x.is_visible, true),
         coalesce(x.is_required_for_publish, false),
         coalesce(old_json.status, 'draft'::public.publication_status)
  from jsonb_to_recordset(p_filters) as x(
    field_definition_id uuid,
    operator text,
    sort_order integer,
    is_visible boolean,
    is_required_for_publish boolean
  )
  left join jsonb_to_recordset(v_before) as old_json(
    id uuid,
    category_id uuid,
    field_definition_id uuid,
    operator text,
    sort_order integer,
    is_visible boolean,
    is_required_for_publish boolean,
    status public.publication_status,
    created_at timestamptz,
    updated_at timestamptz
  ) on old_json.field_definition_id = x.field_definition_id;

  update public.categories set updated_at = now() where id = p_category_id;

  select coalesce(jsonb_agg(to_jsonb(fd) order by fd.sort_order), '[]'::jsonb)
    into v_after
  from public.filter_definitions as fd
  where fd.category_id = p_category_id;

  insert into public.audit_events(
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, source
  ) values (
    v_actor, 'taxonomy_replace_category_filters',
    'categories', p_category_id::text,
    jsonb_build_object('filters', v_before),
    jsonb_build_object('filters', v_after),
    'step2_taxonomy_admin'
  );
  return jsonb_build_object(
    'category_id', p_category_id,
    'filters', v_after,
    'updated_at', (
      select updated_at from public.categories where id = p_category_id
    )
  );
end
$$;

create or replace function public.admin_transition_taxonomy_status(
  p_entity text,
  p_id uuid,
  p_status public.publication_status,
  p_reason text,
  p_expected_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_before jsonb;
  v_after jsonb;
  v_current_updated_at timestamptz;
  v_missing integer;
begin
  if v_actor is null
     or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 10 then
    raise exception 'taxonomy_transition_reason_required' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('coffee_platform_taxonomy', 0)
  );

  if p_entity = 'category' then
    select to_jsonb(c), c.updated_at into v_before, v_current_updated_at
    from public.categories as c where id = p_id for update;
    if v_before is null then raise exception 'category_not_found'; end if;
    if v_current_updated_at <> p_expected_updated_at then
      raise exception 'taxonomy_version_conflict' using errcode = '40001';
    end if;
    update public.categories set status = p_status where id = p_id;
    select to_jsonb(c) into v_after from public.categories as c where id = p_id;
  elsif p_entity = 'field' then
    select to_jsonb(f), f.updated_at into v_before, v_current_updated_at
    from public.field_definitions as f where id = p_id for update;
    if v_before is null then raise exception 'field_definition_not_found'; end if;
    if v_current_updated_at <> p_expected_updated_at then
      raise exception 'taxonomy_version_conflict' using errcode = '40001';
    end if;
    update public.field_definitions set status = p_status where id = p_id;
    select to_jsonb(f) into v_after
    from public.field_definitions as f where id = p_id;
  elsif p_entity = 'filter' then
    select to_jsonb(fd), fd.updated_at into v_before, v_current_updated_at
    from public.filter_definitions as fd where id = p_id for update;
    if v_before is null then raise exception 'filter_definition_not_found'; end if;
    if v_current_updated_at <> p_expected_updated_at then
      raise exception 'taxonomy_version_conflict' using errcode = '40001';
    end if;
    if p_status = 'published'
       and coalesce((v_before ->> 'is_required_for_publish')::boolean, false)
       and exists (
         select 1
         from public.field_definitions as f
         where f.id = (v_before ->> 'field_definition_id')::uuid
           and f.validation_rules ->> 'storage_binding' = 'product_attribute_values'
       ) then
      select count(*) into v_missing
      from public.products as p
      join public.product_categories as pc
        on pc.product_id = p.id
       and pc.category_id = (v_before ->> 'category_id')::uuid
      where p.status = 'published'
        and not exists (
          select 1
          from public.product_attribute_values as pav
          where pav.product_id = p.id
            and pav.field_definition_id =
              (v_before ->> 'field_definition_id')::uuid
        );
      if v_missing > 0 then
        raise exception 'required_filter_missing_on_published_products:%',
          v_missing using errcode = '23514';
      end if;
    end if;
    update public.filter_definitions set status = p_status where id = p_id;
    select to_jsonb(fd) into v_after
    from public.filter_definitions as fd where id = p_id;
  else
    raise exception 'unsupported_taxonomy_entity' using errcode = '22023';
  end if;

  insert into public.audit_events(
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, source
  ) values (
    v_actor, 'taxonomy_transition_' || p_entity,
    case p_entity
      when 'category' then 'categories'
      when 'field' then 'field_definitions'
      else 'filter_definitions'
    end,
    p_id::text,
    v_before,
    v_after || jsonb_build_object('transition_reason', btrim(p_reason)),
    'step2_taxonomy_admin'
  );
  return v_after;
end
$$;

revoke all on function public.admin_validate_taxonomy_change(text, jsonb)
  from public, anon;
revoke all on function public.admin_upsert_category(
  uuid, jsonb, timestamptz
) from public, anon;
revoke all on function public.admin_upsert_field_definition(
  uuid, jsonb, timestamptz
) from public, anon;
revoke all on function public.admin_replace_category_filters(
  uuid, jsonb, timestamptz
) from public, anon;
revoke all on function public.admin_transition_taxonomy_status(
  text, uuid, public.publication_status, text, timestamptz
) from public, anon;

grant execute on function public.admin_validate_taxonomy_change(text, jsonb)
  to authenticated;
grant execute on function public.admin_upsert_category(
  uuid, jsonb, timestamptz
) to authenticated;
grant execute on function public.admin_upsert_field_definition(
  uuid, jsonb, timestamptz
) to authenticated;
grant execute on function public.admin_replace_category_filters(
  uuid, jsonb, timestamptz
) to authenticated;
grant execute on function public.admin_transition_taxonomy_status(
  text, uuid, public.publication_status, text, timestamptz
) to authenticated;

comment on function public.admin_upsert_category(uuid, jsonb, timestamptz)
  is 'STEP2 admin-only atomic category create/update with optimistic concurrency and audit.';
comment on function public.admin_upsert_field_definition(uuid, jsonb, timestamptz)
  is 'STEP2 admin-only atomic field-definition create/update with optimistic concurrency and audit.';
comment on function public.admin_replace_category_filters(uuid, jsonb, timestamptz)
  is 'STEP2 admin-only atomic category-filter replacement with compatibility and published-product impact checks.';
comment on function public.admin_transition_taxonomy_status(
  text, uuid, public.publication_status, text, timestamptz
) is 'STEP2 admin-only audited taxonomy lifecycle transition.';

notify pgrst, 'reload schema';

commit;
