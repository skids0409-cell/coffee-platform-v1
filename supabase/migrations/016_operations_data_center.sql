-- Coffee Platform V1 — operations data center atomic organization import
-- Version: 1.0.0 | Date: 2026-08-17
begin;

create or replace function public.import_organization_intake_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_batch public.data_import_batches%rowtype;
  v_row public.data_intake_rows%rowtype;
  v_source_id uuid;
  v_organization_id uuid;
  v_location_id uuid;
  v_imported integer := 0;
  v_skipped integer := 0;
  v_source_key text;
  v_location_key text;
begin
  if not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  select * into v_batch
  from public.data_import_batches
  where id = p_batch_id and entity_type = 'organization'
  for update;
  if not found then raise exception 'batch_not_found'; end if;
  if v_batch.status = 'imported' then
    return jsonb_build_object('batch_id', v_batch.id, 'imported', 0, 'skipped', v_batch.valid_rows, 'already_imported', true);
  end if;
  if v_batch.status <> 'ready' then raise exception 'batch_not_ready'; end if;

  for v_row in
    select * from public.data_intake_rows
    where batch_id = p_batch_id and validation_status in ('valid','warning') and target_id is null
    order by source_row_number
    for update
  loop
    if exists (
      select 1 from public.organizations o
      join public.locations l on l.organization_id = o.id
      where o.status <> 'archived'
        and lower(trim(o.name_ar)) = lower(trim(v_row.normalized_payload->>'name_ar'))
        and lower(trim(l.address_ar)) = lower(trim(v_row.normalized_payload->>'address_ar'))
    ) then
      update public.data_intake_rows
      set validation_status = 'invalid',
          validation_messages = validation_messages || '["السجل موجود مسبقاً وقت الاستيراد"]'::jsonb,
          reviewed_by = v_actor,
          reviewed_at = now()
      where id = v_row.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_source_key := 'SRC-UI-' || upper(substr(replace(p_batch_id::text, '-', ''), 1, 12)) || '-' || v_row.source_row_number::text;
    v_location_key := 'LOC-UI-' || upper(substr(replace(p_batch_id::text, '-', ''), 1, 12)) || '-' || v_row.source_row_number::text;
    insert into public.source_records
      (source_key,title,source_type,url,publisher,accessed_at,license_note,evidence_excerpt,created_by)
    values
      (v_source_key,
       v_batch.source_label || ' — صف ' || v_row.source_row_number::text,
       'editorial',
       nullif(v_row.normalized_payload->>'website_url',''),
       v_batch.source_label,
       now(),
       'Facts entered by the platform owner; no media copied',
       'Owner-confirmed organization identity, contact, and Baghdad address.',
       v_actor)
    returning id into v_source_id;

    insert into public.organizations
      (slug,name_ar,website_url,phone,verification_tier,status,source_checked_at,created_by)
    values
      (v_row.normalized_payload->>'slug',
       v_row.normalized_payload->>'name_ar',
       nullif(v_row.normalized_payload->>'website_url',''),
       nullif(v_row.normalized_payload->>'phone',''),
       't2_source_checked','draft',now(),v_actor)
    returning id into v_organization_id;

    insert into public.organization_roles (organization_id,role_type,is_primary)
    values (v_organization_id,'cafe',true);

    insert into public.locations
      (source_key,organization_id,market_id,name_ar,address_ar,district_ar,phone,status)
    values
      (v_location_key,v_organization_id,v_batch.market_id,
       nullif(v_row.normalized_payload->>'district_ar',''),
       v_row.normalized_payload->>'address_ar',
       nullif(v_row.normalized_payload->>'district_ar',''),
       nullif(v_row.normalized_payload->>'phone',''),'draft')
    returning id into v_location_id;

    insert into public.entity_source_links (entity_table,entity_id,source_record_id,claim_scope,is_primary,created_by)
    values
      ('organizations',v_organization_id,v_source_id,array['identity','contact','location'],true,v_actor),
      ('locations',v_location_id,v_source_id,array['address'],true,v_actor);

    update public.data_intake_rows
    set validation_status = 'imported', target_table = 'organizations', target_id = v_organization_id,
        reviewed_by = v_actor, reviewed_at = now()
    where id = v_row.id;
    v_imported := v_imported + 1;
  end loop;

  update public.data_import_batches
  set status = 'imported', imported_by = v_actor, imported_at = now(),
      valid_rows = v_imported,
      rejected_rows = total_rows - v_imported
  where id = p_batch_id;
  insert into public.audit_events (actor_user_id,action,entity_table,entity_id,after_data,source)
  values (v_actor,'import_organization_batch_drafts','data_import_batches',p_batch_id::text,
    jsonb_build_object('imported',v_imported,'skipped',v_skipped),'data_center_ui');
  return jsonb_build_object('batch_id',p_batch_id,'imported',v_imported,'skipped',v_skipped,'already_imported',false);
end;
$$;

revoke all on function public.import_organization_intake_batch(uuid) from public, anon;
grant execute on function public.import_organization_intake_batch(uuid) to authenticated;
comment on function public.import_organization_intake_batch(uuid) is 'Atomically converts validated organization intake rows into sourced draft cafe records; admin only.';

commit;
