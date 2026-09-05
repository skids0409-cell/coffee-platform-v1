-- Wave A / Phase 4 — Unified Audit, Retention, Legal Hold & Disposition
begin;

create table if not exists public.governed_audit_log (
  id bigint generated always as identity primary key,
  event_uuid uuid not null default gen_random_uuid() unique,
  event_type text not null,
  object_type text not null,
  object_id text not null,
  actor_user_id uuid null,
  service_actor text null,
  source_relation text not null,
  source_event_id text not null,
  source_system text not null,
  occurred_at timestamptz not null,
  before_data jsonb null,
  after_data jsonb null,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid null,
  policy_version text not null default 'ea-baseline-v1',
  created_at timestamptz not null default now(),
  unique(source_relation,source_event_id)
);

alter table public.governed_audit_log enable row level security;
revoke all on public.governed_audit_log from anon,authenticated;
grant select on public.governed_audit_log to authenticated;
drop policy if exists governed_audit_log_staff_read on public.governed_audit_log;
create policy governed_audit_log_staff_read on public.governed_audit_log for select to authenticated using ((select private.is_staff()));

create or replace function private.block_audit_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'immutable_audit_history' using errcode='55000';
end $$;
revoke all on function private.block_audit_mutation() from public,anon,authenticated;

create or replace function private.mirror_audit_event()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,before_data,after_data,metadata,policy_version)
  values(new.action,new.entity_table,new.entity_id,new.actor_user_id,'audit_events',new.id::text,new.source,new.created_at,new.before_data,new.after_data,'{}'::jsonb,'ea-baseline-v1')
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_audit_event() from public,anon,authenticated;

create or replace function private.mirror_media_ingestion_event()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,service_actor,source_relation,source_event_id,source_system,occurred_at,metadata,correlation_id,policy_version)
  values(new.event_type,'media_asset',coalesce(new.asset_id::text,new.upload_intent_id::text,'unknown'),new.actor_user_id,new.service_actor,'media_ingestion_events',new.id::text,'media_vault',new.created_at,
         jsonb_build_object('previous_state',new.previous_state,'next_state',new.next_state,'technical_report',new.technical_report),new.correlation_id,new.policy_version)
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_media_ingestion_event() from public,anon,authenticated;

create or replace function private.mirror_disposal_audit()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values('asset_disposed','media_asset',new.asset_id::text,new.disposed_by,'media_asset_disposal_audit',new.id::text,'media_vault',new.disposed_at,
         jsonb_build_object('purge_request_id',new.purge_request_id,'asset_snapshot',new.asset_snapshot,'relations_snapshot',new.relations_snapshot,'storage_result',new.storage_result),new.policy_version)
  on conflict(source_relation,source_event_id) do nothing;
  return new;
end $$;
revoke all on function private.mirror_disposal_audit() from public,anon,authenticated;

drop trigger if exists mirror_governed_audit_event on public.audit_events;
create trigger mirror_governed_audit_event after insert on public.audit_events for each row execute function private.mirror_audit_event();
drop trigger if exists mirror_governed_media_ingestion_event on public.media_ingestion_events;
create trigger mirror_governed_media_ingestion_event after insert on public.media_ingestion_events for each row execute function private.mirror_media_ingestion_event();
drop trigger if exists mirror_governed_disposal_audit on public.media_asset_disposal_audit;
create trigger mirror_governed_disposal_audit after insert on public.media_asset_disposal_audit for each row execute function private.mirror_disposal_audit();

-- Historical backfill into one canonical audit projection.
insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,before_data,after_data,metadata,policy_version)
select a.action,a.entity_table,a.entity_id,a.actor_user_id,'audit_events',a.id::text,a.source,a.created_at,a.before_data,a.after_data,'{}'::jsonb,'ea-baseline-v1'
from public.audit_events a on conflict(source_relation,source_event_id) do nothing;

insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,service_actor,source_relation,source_event_id,source_system,occurred_at,metadata,correlation_id,policy_version)
select e.event_type,'media_asset',coalesce(e.asset_id::text,e.upload_intent_id::text,'unknown'),e.actor_user_id,e.service_actor,'media_ingestion_events',e.id::text,'media_vault',e.created_at,
       jsonb_build_object('previous_state',e.previous_state,'next_state',e.next_state,'technical_report',e.technical_report),e.correlation_id,e.policy_version
from public.media_ingestion_events e on conflict(source_relation,source_event_id) do nothing;

insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
select 'asset_disposed','media_asset',d.asset_id::text,d.disposed_by,'media_asset_disposal_audit',d.id::text,'media_vault',d.disposed_at,
       jsonb_build_object('purge_request_id',d.purge_request_id,'asset_snapshot',d.asset_snapshot,'relations_snapshot',d.relations_snapshot,'storage_result',d.storage_result),d.policy_version
from public.media_asset_disposal_audit d on conflict(source_relation,source_event_id) do nothing;

-- Make source audit histories append-only too.
do $$ declare t text; begin
  foreach t in array array['audit_events','media_ingestion_events','media_asset_disposal_audit'] loop
    execute format('drop trigger if exists immutable_audit_guard on public.%I',t);
    execute format('create trigger immutable_audit_guard before update or delete on public.%I for each row execute function private.block_audit_mutation()',t);
  end loop;
end $$;

create table if not exists public.governed_retention_policies (
  policy_code text primary key,
  object_type text not null references public.governed_object_type_registry(object_type) on delete restrict,
  mode text not null check(mode in ('fixed','policy_required','indefinite')),
  default_retention_days integer null check(default_retention_days is null or default_retention_days>=0),
  legal_hold_supported boolean not null default true,
  disposition_requires_approval boolean not null default true,
  description text not null,
  baseline_version text not null default 'EA-1.0',
  created_at timestamptz not null default now(),
  unique(object_type)
);

alter table public.governed_retention_policies enable row level security;
revoke all on public.governed_retention_policies from anon,authenticated;
grant select on public.governed_retention_policies to authenticated;
drop policy if exists governed_retention_policies_staff_read on public.governed_retention_policies;
create policy governed_retention_policies_staff_read on public.governed_retention_policies for select to authenticated using ((select private.is_staff()));

insert into public.governed_retention_policies(policy_code,object_type,mode,default_retention_days,legal_hold_supported,disposition_requires_approval,description) values
('media_quarantine_30d','media_asset','fixed',30,true,true,'Existing governed Media Vault quarantine retention baseline.'),
('source_record_policy','source_record','policy_required',null,true,true,'Retention duration must be assigned by the institutional records schedule.'),
('import_batch_policy','data_import_batch','policy_required',null,true,true,'Retention duration must be assigned by the institutional records schedule.'),
('organization_policy','organization','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.'),
('brand_policy','brand','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.'),
('product_policy','product','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.'),
('offer_policy','offer','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.'),
('content_policy','content','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.'),
('origin_claim_policy','origin_claim','policy_required',null,true,true,'No automatic deletion until an approved retention schedule is assigned.')
on conflict(object_type) do update set mode=excluded.mode,default_retention_days=excluded.default_retention_days,legal_hold_supported=excluded.legal_hold_supported,disposition_requires_approval=excluded.disposition_requires_approval,description=excluded.description,baseline_version='EA-1.0';

create table if not exists public.governed_legal_holds (
  id uuid primary key default gen_random_uuid(),
  object_type text not null references public.governed_object_type_registry(object_type) on delete restrict,
  object_id uuid not null,
  status text not null default 'active' check(status in ('active','released')),
  reason text not null check(length(trim(reason))>=10),
  placed_by uuid not null references public.profiles(id) on delete restrict,
  placed_at timestamptz not null default now(),
  released_by uuid null references public.profiles(id) on delete restrict,
  released_at timestamptz null,
  release_reason text null,
  created_at timestamptz not null default now()
);
create unique index if not exists governed_legal_holds_one_active_idx on public.governed_legal_holds(object_type,object_id) where status='active';
alter table public.governed_legal_holds enable row level security;
revoke all on public.governed_legal_holds from anon,authenticated;
grant select on public.governed_legal_holds to authenticated;
drop policy if exists governed_legal_holds_staff_read on public.governed_legal_holds;
create policy governed_legal_holds_staff_read on public.governed_legal_holds for select to authenticated using ((select private.is_staff()));

create or replace function public.admin_set_governed_legal_hold(p_object_type text,p_object_id uuid,p_action text,p_reason text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_hold public.governed_legal_holds;
begin
  if v_actor is null or not (select private.is_staff(array['verifier','admin']::public.staff_role[])) then raise exception 'verifier_required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<10 then raise exception 'hold_reason_required'; end if;
  if not exists(select 1 from public.governed_object_envelope e where e.object_type=p_object_type and e.object_id=p_object_id) then raise exception 'governed_object_not_found'; end if;
  if p_action='place' then
    insert into public.governed_legal_holds(object_type,object_id,status,reason,placed_by) values(p_object_type,p_object_id,'active',trim(p_reason),v_actor)
    returning * into v_hold;
  elsif p_action='release' then
    update public.governed_legal_holds set status='released',released_by=v_actor,released_at=now(),release_reason=trim(p_reason)
    where object_type=p_object_type and object_id=p_object_id and status='active' returning * into v_hold;
    if v_hold.id is null then raise exception 'active_hold_not_found'; end if;
  else raise exception 'invalid_hold_action'; end if;
  insert into public.governed_audit_log(event_type,object_type,object_id,actor_user_id,source_relation,source_event_id,source_system,occurred_at,metadata,policy_version)
  values(case when p_action='place' then 'legal_hold_placed' else 'legal_hold_released' end,p_object_type,p_object_id::text,v_actor,'governed_legal_holds',v_hold.id::text||':'||p_action,'governance_kernel',now(),jsonb_build_object('reason',trim(p_reason)),'ea-baseline-v1');
  return jsonb_build_object('ok',true,'hold_id',v_hold.id,'status',v_hold.status);
end $$;
revoke all on function public.admin_set_governed_legal_hold(text,uuid,text,text) from public,anon;
grant execute on function public.admin_set_governed_legal_hold(text,uuid,text,text) to authenticated;

create or replace view public.governed_retention_projection with (security_invoker=true) as
select e.object_type,e.object_id,e.canonical_phase,p.policy_code,p.mode,p.default_retention_days,p.disposition_requires_approval,
       case when e.object_type='media_asset' then coalesce((e.governance_metadata->>'legal_hold')::boolean,false)
            else exists(select 1 from public.governed_legal_holds h where h.object_type=e.object_type and h.object_id=e.object_id and h.status='active') end as legal_hold,
       case when e.object_type='media_asset' then nullif(e.governance_metadata->>'retention_expires_at','')::timestamptz else null end as retain_until,
       case
         when (case when e.object_type='media_asset' then coalesce((e.governance_metadata->>'legal_hold')::boolean,false) else exists(select 1 from public.governed_legal_holds h where h.object_type=e.object_type and h.object_id=e.object_id and h.status='active') end) then false
         when p.mode='policy_required' then false
         when e.object_type='media_asset' and nullif(e.governance_metadata->>'retention_expires_at','') is not null then nullif(e.governance_metadata->>'retention_expires_at','')::timestamptz<=now()
         else false
       end as disposition_eligible
from public.governed_object_envelope e
left join public.governed_retention_policies p on p.object_type=e.object_type;

revoke all on public.governed_retention_projection from anon,authenticated;
grant select on public.governed_retention_projection to authenticated;

commit;
