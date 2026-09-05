-- Wave C / Phase 7 performance hardening — cover preservation foreign keys.
begin;

create index if not exists oais_preservation_events_actor_user_id_idx
  on public.oais_preservation_events(actor_user_id)
  where actor_user_id is not null;

create index if not exists oais_preservation_packages_created_by_idx
  on public.oais_preservation_packages(created_by)
  where created_by is not null;

create index if not exists oais_preservation_packages_source_package_id_idx
  on public.oais_preservation_packages(source_package_id)
  where source_package_id is not null;

commit;
