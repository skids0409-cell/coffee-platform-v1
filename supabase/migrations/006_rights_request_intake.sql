-- Coffee Platform V1 — Rights request intake hardening
-- Version: 1.0.0 | Date: 2026-08-09
-- Run after migrations 001–005. Safe to run once; transaction rolls back on error.

begin;

alter table public.rights_requests
  add column if not exists target_reference_text text;

alter table public.rights_requests
  add column if not exists evidence_reference text;

do $$
declare
  constraint_name text;
begin
  select c.conname into constraint_name
  from pg_constraint c
  where c.conrelid = 'public.rights_requests'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) like '%organization_id%product_id%request_type%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.rights_requests drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.rights_requests
  drop constraint if exists rights_requests_target_required;

alter table public.rights_requests
  add constraint rights_requests_target_required check (
    organization_id is not null
    or product_id is not null
    or nullif(btrim(target_reference_text), '') is not null
    or request_type = 'privacy'
  );

alter table public.rights_requests
  drop constraint if exists rights_requests_details_length;

alter table public.rights_requests
  add constraint rights_requests_details_length check (
    char_length(btrim(details)) between 20 and 5000
  );

alter table public.rights_requests
  drop constraint if exists rights_requests_requester_name_length;

alter table public.rights_requests
  add constraint rights_requests_requester_name_length check (
    char_length(btrim(requester_name)) between 2 and 120
  );

alter table public.rights_requests
  drop constraint if exists rights_requests_target_reference_length;

alter table public.rights_requests
  add constraint rights_requests_target_reference_length check (
    target_reference_text is null
    or char_length(target_reference_text) <= 500
  );

alter table public.rights_requests
  drop constraint if exists rights_requests_evidence_reference_length;

alter table public.rights_requests
  add constraint rights_requests_evidence_reference_length check (
    evidence_reference is null
    or char_length(evidence_reference) <= 1000
  );

create index if not exists rights_requests_status_created_idx
  on public.rights_requests(status, created_at desc);

comment on column public.rights_requests.target_reference_text is
  'User-supplied page URL, entity name, or external reference before canonical entity resolution.';

comment on column public.rights_requests.evidence_reference is
  'Optional public evidence URL supplied during intake; private file uploads remain deferred.';

commit;

select
  case
    when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rights_requests'
        and column_name = 'target_reference_text'
    ) then 'READY'
    else 'CHECK'
  end as rights_intake_schema;
