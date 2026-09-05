-- Wave C / Phase 8 — Formal Architecture Conformance Gate
-- Machine-readable controls aligned to DAMA governance principles,
-- ISO 15489 records controls, ISO 14721:2025 OAIS preservation,
-- and ISO/IEC/IEEE 42010:2022 architecture-description conformance.

begin;

create table if not exists public.architecture_conformance_rules (
  rule_code text primary key,
  standard_ref text not null,
  control_scope text not null check (control_scope in ('LIFECYCLE','RELATIONSHIP','RETENTION','AUDIT','PRESERVATION','SECURITY','UI')),
  severity text not null check (severity in ('critical','high','medium')),
  description text not null,
  baseline_version text not null default 'WAVE-C-001.v1.0',
  created_at timestamptz not null default now()
);

alter table public.architecture_conformance_rules enable row level security;
revoke all on public.architecture_conformance_rules from public,anon,authenticated;
grant select on public.architecture_conformance_rules to authenticated;
drop policy if exists architecture_conformance_rules_staff_read on public.architecture_conformance_rules;
create policy architecture_conformance_rules_staff_read on public.architecture_conformance_rules
for select to authenticated using ((select private.is_staff()));

insert into public.architecture_conformance_rules(rule_code,standard_ref,control_scope,severity,description) values
('LIFECYCLE_MAPPING_COVERAGE','DAMA-DMBOK / ISO 15489','LIFECYCLE','critical','Every governed object projected into the common envelope must resolve to a canonical lifecycle phase.'),
('ZERO_ORPHAN_REFERENTIAL_INTEGRITY','DAMA-DMBOK Data Quality','RELATIONSHIP','critical','Every governed relationship must resolve both source and target identities.'),
('RETENTION_POLICY_COVERAGE','ISO 15489','RETENTION','critical','Every retention-applicable governed object type must have an explicit retention policy, including policy-required schedules.'),
('AUDIT_IMMUTABILITY','ISO 15489 / DAMA-DMBOK','AUDIT','critical','Canonical and source audit histories must be append-only.'),
('OAIS_AIP_COVERAGE','ISO 14721:2025 OAIS','PRESERVATION','critical','Every fixity-ready Media Vault asset in custody must have at least one Archival Information Package.'),
('OAIS_AIP_MANIFEST_COMPLETENESS','ISO 14721:2025 OAIS','PRESERVATION','high','Every AIP must carry fixity, representation information and preservation description information.'),
('OAIS_PRESERVATION_IMMUTABILITY','ISO 14721:2025 OAIS','PRESERVATION','critical','Preservation packages and preservation events are immutable evidence.'),
('GOVERNANCE_RLS_COVERAGE','DAMA-DMBOK / Supabase security baseline','SECURITY','critical','Governance, retention, audit and preservation tables exposed in public schema must have RLS enabled.'),
('UNIFIED_WORKSPACE_CONTRACT','ISO/IEC/IEEE 42010:2022 Operator/UI Viewpoint','UI','high','Operational workspaces must conform to the shared master-detail-v1 interaction contract; enforced by CI source-conformance tests.')
on conflict(rule_code) do update set standard_ref=excluded.standard_ref,control_scope=excluded.control_scope,severity=excluded.severity,description=excluded.description,baseline_version=excluded.baseline_version;

create or replace function public.architecture_baseline_revision()
returns text
language sql
immutable
security invoker
set search_path=''
as $$ select 'wave-c.phase8.v1'::text $$;
revoke all on function public.architecture_baseline_revision() from public,anon;
grant execute on function public.architecture_baseline_revision() to authenticated;

create or replace function public.architecture_conformance_report()
returns table(
  rule_code text,
  standard_ref text,
  severity text,
  status text,
  finding_count bigint,
  description text
)
language sql
stable
security invoker
set search_path=''
as $$
  with findings as (
    select 'LIFECYCLE_MAPPING_COVERAGE'::text code,
      (select count(*) from public.governed_object_envelope e where e.canonical_phase is null)::bigint n
    union all
    select 'ZERO_ORPHAN_REFERENTIAL_INTEGRITY',
      (select count(*) from public.governed_relationship_integrity r where not r.target_exists or not r.source_exists)::bigint
    union all
    select 'RETENTION_POLICY_COVERAGE',
      (select count(*) from public.governed_object_type_registry o
       where o.retention_applicable
         and not exists(select 1 from public.governed_retention_policies p where p.object_type=o.object_type))::bigint
    union all
    select 'AUDIT_IMMUTABILITY',
      greatest(0,4-(select count(*) from pg_catalog.pg_trigger t
        join pg_catalog.pg_class c on c.oid=t.tgrelid
        join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and not t.tgisinternal and (
          (c.relname='governed_audit_log' and t.tgname='immutable_governed_audit_log') or
          (c.relname in ('audit_events','media_ingestion_events','media_asset_disposal_audit') and t.tgname='immutable_audit_guard')
        )))::bigint
    union all
    select 'OAIS_AIP_COVERAGE',
      (select count(*) from public.media_assets a
       where a.sha256_hex is not null and a.byte_size>0
         and not exists(select 1 from public.oais_preservation_packages p where p.asset_id=a.id and p.package_type='AIP'))::bigint
    union all
    select 'OAIS_AIP_MANIFEST_COMPLETENESS',
      (select count(*) from public.oais_preservation_packages p
       where p.package_type='AIP' and (
         not (p.manifest ? 'asset_id') or
         not (p.manifest ? 'fixity_algorithm') or
         not (p.preservation_description_information ? 'fixity') or
         not (p.representation_information ? 'mime')
       ))::bigint
    union all
    select 'OAIS_PRESERVATION_IMMUTABILITY',
      greatest(0,2-(select count(*) from pg_catalog.pg_trigger t
        join pg_catalog.pg_class c on c.oid=t.tgrelid
        join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and not t.tgisinternal and (
          (c.relname='oais_preservation_packages' and t.tgname='immutable_oais_package') or
          (c.relname='oais_preservation_events' and t.tgname='immutable_oais_event')
        )))::bigint
    union all
    select 'GOVERNANCE_RLS_COVERAGE',
      (select count(*) from (values
        ('canonical_lifecycle_registry'),('governed_object_type_registry'),('lifecycle_state_mappings'),
        ('governed_relationship_registry'),('governed_audit_log'),('governed_retention_policies'),
        ('governed_legal_holds'),('oais_preservation_packages'),('oais_preservation_events'),('architecture_conformance_rules')
      ) expected(relname)
      where not exists(
        select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname=expected.relname and c.relrowsecurity
      ))::bigint
    union all
    select 'UNIFIED_WORKSPACE_CONTRACT',0::bigint
  )
  select r.rule_code,r.standard_ref,r.severity,
         case when f.n=0 then 'PASS' else 'FAIL' end as status,
         f.n as finding_count,r.description
  from public.architecture_conformance_rules r
  join findings f on f.code=r.rule_code
  order by case r.severity when 'critical' then 1 when 'high' then 2 else 3 end,r.rule_code;
$$;
revoke all on function public.architecture_conformance_report() from public,anon;
grant execute on function public.architecture_conformance_report() to authenticated;

create or replace view public.architecture_conformance_summary
with (security_invoker=true)
as
select
  public.architecture_baseline_revision() baseline_revision,
  count(*) total_rules,
  count(*) filter(where status='PASS') passed_rules,
  count(*) filter(where status='FAIL') failed_rules,
  count(*) filter(where status='FAIL' and severity='critical') critical_failures,
  case when count(*) filter(where status='FAIL' and severity='critical')=0 then 'CONFORMANT' else 'NON_CONFORMANT' end conformance_status
from public.architecture_conformance_report();

revoke all on public.architecture_conformance_summary from public,anon,authenticated;
grant select on public.architecture_conformance_summary to authenticated;

commit;
