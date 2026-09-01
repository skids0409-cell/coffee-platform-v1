-- Coffee Platform V1 — Baghdad organization review Batch 001 corrections
-- Version: 1.0.0 | Date: 2026-08-09
-- Corrects source-backed data only. Nothing is published by this migration.

begin;

do $$
begin
  if to_regclass('public.data_import_batches') is null then
    raise exception 'Migration 005 must be completed before 007';
  end if;
  if not exists (select 1 from public.data_import_batches where batch_code = 'BGD-ORG-001') then
    raise exception 'Baghdad organization Batch 001 was not found';
  end if;
  if (select count(*) from public.profiles where role = 'admin' and is_active) <> 1 then
    raise exception 'Migration 007 requires exactly one active admin profile';
  end if;
end $$;

update public.organizations
set phone = '+9647508035884',
    status = 'in_review',
    source_checked_at = '2026-08-09T00:00:00Z'
where slug = 'italian-coffee-store-iraq';

update public.locations set status = 'archived' where source_key = 'LOC-BGD-012';

update public.source_records
set evidence_excerpt = 'official_organization: Identity, Iraq e-commerce catalog, equipment/coffee retail, current Erbil contact address and phone; no Baghdad office confirmed',
    accessed_at = '2026-08-09T00:00:00Z'
where source_key = 'SRC-BGD-006';

update public.data_intake_rows ir
set normalized_payload = coalesce(ir.normalized_payload, '{}'::jsonb) || jsonb_build_object(
      'phone', '+9647508035884',
      'canonical_status', 'in_review',
      'baghdad_location_status', 'not_confirmed',
      'intake_decision', 'hold_for_baghdad_location_confirmation'
    ),
    validation_status = 'warning',
    validation_messages = '["Current official contact page lists Erbil, not Baghdad; Baghdad location archived pending direct evidence"]'::jsonb,
    reviewed_by = a.id,
    reviewed_at = now()
from public.data_import_batches b
cross join lateral (
  select id from public.profiles where role = 'admin' and is_active order by created_at limit 1
) a
where ir.batch_id = b.id
  and b.batch_code = 'BGD-ORG-001'
  and ir.dedupe_key = 'ORG-BGD-006';

update public.data_quality_issues
set severity = 'high',
    issue_type = 'launch_market_location_conflict',
    message_ar = 'صفحة الاتصال الرسمية الحالية تعرض مكتب أربيل وأرقاماً أحدث، ولا تثبت موقع معسكر الرشيد في بغداد.',
    recommended_action = 'Keep the organization in review, archive LOC-BGD-012, and require direct official evidence before adding a Baghdad location.',
    status = 'open',
    resolution_note = 'Phone corrected to the current official contact number; the unconfirmed Baghdad location was archived.',
    resolved_by = null,
    resolved_at = null
where issue_code = 'DQ-BGD-002';

update public.data_quality_issues
set message_ar = 'صفحة اتصال كشتة تتضمن بيانات قالب أسترالية غير خاصة بالنشاط؛ عنوان اليرموك العراقي هو العنوان المحلي المتكرر في الصفحة.',
    recommended_action = 'Keep only the Yarmouk showroom data and permanently exclude the Australian template address and phone.',
    status = 'open'
where issue_code = 'DQ-BGD-001';

insert into public.audit_events (actor_user_id,action,entity_table,entity_id,before_data,after_data,source)
select a.id,
       'correct_baghdad_batch_001_source_conflicts',
       'data_import_batches',
       b.id::text,
       jsonb_build_object('italian_coffee_phone','+9647502210221','italian_coffee_baghdad_location','in_review'),
       jsonb_build_object('italian_coffee_phone','+9647508035884','italian_coffee_baghdad_location','archived','published_records',0),
       'migration_007'
from public.data_import_batches b
cross join lateral (
  select id from public.profiles where role = 'admin' and is_active order by created_at limit 1
) a
where b.batch_code = 'BGD-ORG-001'
  and not exists (
    select 1 from public.audit_events e
    where e.action = 'correct_baghdad_batch_001_source_conflicts' and e.entity_id = b.id::text
  );

commit;

select
  (select phone from public.organizations where slug = 'italian-coffee-store-iraq') as corrected_phone,
  (select status from public.locations where source_key = 'LOC-BGD-012') as unconfirmed_baghdad_location,
  (select count(*) from public.locations where source_key like 'LOC-BGD-%' and status = 'in_review') as locations_in_review,
  (select count(*) from public.locations where source_key like 'LOC-BGD-%' and status = 'archived') as locations_archived,
  (select count(*) from public.organizations where slug in (
    'ridha-alwan-coffee','locus-coffee-iraq','garam-cafe','mr-kims-cafe',
    'kshta-coffee-tools','italian-coffee-store-iraq','nespresso-iraq','sumer-land'
  ) and status = 'published') as accidentally_published;
