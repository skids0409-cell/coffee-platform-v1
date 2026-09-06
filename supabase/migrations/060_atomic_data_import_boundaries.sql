-- Atomic Data Center boundaries for staging, archive/restore, and disposal.
-- The existing import_organization_intake_batch function already owns its
-- canonical import writes, row locking and audit in one transaction.
begin;

create or replace function public.admin_stage_organization_intake_batch(
  p_source_label text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_market_id uuid;
  v_batch_id uuid := gen_random_uuid();
  v_batch_code text := 'UI_ORG_' || to_char(now() at time zone 'UTC','YYYYMMDD') || '_' || upper(substr(replace(v_batch_id::text,'-',''),1,8));
  v_source_label text := btrim(coalesce(p_source_label,''));
  v_total integer;
  v_valid integer;
  v_rejected integer;
  v_batch jsonb;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if length(v_source_label) < 3 or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'invalid_stage_payload' using errcode='22023';
  end if;

  v_total := jsonb_array_length(p_rows);
  if v_total < 1 or v_total > 500 then
    raise exception 'invalid_stage_row_count' using errcode='22023';
  end if;

  select count(*) into v_valid
  from jsonb_array_elements(p_rows) row_data
  where coalesce(row_data->>'validation_status','') in ('valid','warning');
  v_rejected := v_total - v_valid;
  if v_valid < 1 then
    raise exception 'no_valid_rows' using errcode='23514';
  end if;

  select id into v_market_id from public.markets where code='IQ-BGD' limit 1;
  if v_market_id is null then raise exception 'market_missing' using errcode='P0001'; end if;

  insert into public.data_import_batches(
    id,batch_code,entity_type,market_id,source_label,status,
    total_rows,valid_rows,rejected_rows,created_by
  ) values (
    v_batch_id,v_batch_code,'organization',v_market_id,v_source_label,'ready',
    v_total,v_valid,v_rejected,v_actor
  );

  insert into public.data_intake_rows(
    batch_id,source_row_number,dedupe_key,raw_payload,normalized_payload,
    validation_status,validation_messages
  )
  select
    v_batch_id,
    (row_data->>'source_row_number')::integer,
    nullif(row_data->>'dedupe_key',''),
    coalesce(row_data->'raw_payload','{}'::jsonb),
    row_data->'normalized_payload',
    row_data->>'validation_status',
    coalesce(row_data->'validation_messages','[]'::jsonb)
  from jsonb_array_elements(p_rows) row_data;

  if exists (
    select 1 from public.data_intake_rows r
    where r.batch_id=v_batch_id
      and (r.source_row_number < 1 or r.validation_status not in ('valid','warning','invalid'))
  ) then
    raise exception 'invalid_stage_row' using errcode='22023';
  end if;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,after_data,source)
  values(
    v_actor,'stage_organization_batch','data_import_batches',v_batch_id::text,
    jsonb_build_object('batch_code',v_batch_code,'total_rows',v_total,'valid_rows',v_valid,'rejected_rows',v_rejected),
    'data_import_atomic_stage_v1'
  );

  select to_jsonb(b) into v_batch from public.data_import_batches b where b.id=v_batch_id;
  return jsonb_build_object('created',true,'batch',v_batch);
end $$;

create or replace function public.admin_transition_data_import_batch(
  p_batch_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_status text;
  v_imported_at timestamptz;
  v_next text;
begin
  if v_actor is null or not (select private.is_staff()) then
    raise exception 'staff_required' using errcode='42501';
  end if;
  if p_action not in ('archive','restore') then
    raise exception 'invalid_batch_action' using errcode='22023';
  end if;

  select to_jsonb(b),b.status,b.imported_at into v_before,v_status,v_imported_at
  from public.data_import_batches b where b.id=p_batch_id for update;
  if v_before is null then raise exception 'batch_not_found' using errcode='P0002'; end if;

  if p_action='archive' then
    if v_status not in ('imported','rejected') then
      raise exception 'batch_not_complete' using errcode='23514';
    end if;
    v_next := 'archived';
  else
    if v_status <> 'archived' then
      raise exception 'archived_batch_required' using errcode='23514';
    end if;
    v_next := case when v_imported_at is not null then 'imported' else 'rejected' end;
  end if;

  update public.data_import_batches set status=v_next where id=p_batch_id;
  select to_jsonb(b) into v_after from public.data_import_batches b where b.id=p_batch_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(v_actor,p_action||'_batch','data_import_batches',p_batch_id::text,v_before,v_after,'data_import_atomic_transition_v1');

  return jsonb_build_object('updated',true,'id',p_batch_id,'status',v_next,'record',v_after);
end $$;

create or replace function public.admin_delete_archived_data_import_batch(
  p_batch_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_status text;
  v_rows integer;
begin
  if v_actor is null or not (select private.is_staff(array['admin']::public.staff_role[])) then
    raise exception 'admin_required' using errcode='42501';
  end if;

  select to_jsonb(b),b.status into v_before,v_status
  from public.data_import_batches b where b.id=p_batch_id for update;
  if v_before is null then raise exception 'batch_not_found' using errcode='P0002'; end if;
  if v_status <> 'archived' then raise exception 'archived_batch_required' using errcode='23514'; end if;

  select count(*) into v_rows from public.data_intake_rows where batch_id=p_batch_id;

  insert into public.audit_events(actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
  values(
    v_actor,'delete_archived_batch','data_import_batches',p_batch_id::text,
    v_before || jsonb_build_object('intake_rows',v_rows),
    jsonb_build_object('deleted',true),
    'data_import_atomic_delete_v1'
  );

  delete from public.data_import_batches where id=p_batch_id;
  return jsonb_build_object('updated',true,'id',p_batch_id,'deleted',true,'deleted_rows',v_rows);
end $$;

revoke all on function public.admin_stage_organization_intake_batch(text,jsonb) from public,anon;
revoke all on function public.admin_transition_data_import_batch(uuid,text) from public,anon;
revoke all on function public.admin_delete_archived_data_import_batch(uuid) from public,anon;
grant execute on function public.admin_stage_organization_intake_batch(text,jsonb) to authenticated;
grant execute on function public.admin_transition_data_import_batch(uuid,text) to authenticated;
grant execute on function public.admin_delete_archived_data_import_batch(uuid) to authenticated;

commit;
