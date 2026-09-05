-- Coffee Platform V1 — Wave A Phase 1 advisor follow-up.
-- Covers the lifecycle_state_mappings -> canonical_lifecycle_registry FK lookup.

begin;

create index if not exists lifecycle_state_mappings_canonical_phase_idx
  on public.lifecycle_state_mappings(canonical_phase);

commit;
