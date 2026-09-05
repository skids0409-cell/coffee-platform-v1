# Wave C — Preservation & Architecture Conformance Baseline

Status: Implemented
Baseline: `wave-c.phase8.v1`

## Scope

Wave C adds two enforceable platform capabilities on top of the Wave A governance kernel and Wave B unified operator workspace contract.

1. Phase 7 — OAIS-aligned preservation capability.
2. Phase 8 — machine-readable architecture conformance gate.

This architecture is **aligned with** recognized standards and frameworks. The repository must not claim ISO certification merely because these controls exist.

## Normative hierarchy

- Enterprise information/data governance: DAMA-DMBOK governance principles.
- Records lifecycle and retention controls: ISO 15489.
- Digital preservation reference model: ISO 14721:2025 OAIS.
- Architecture Description and viewpoints: ISO/IEC/IEEE 42010:2022.

## Phase 7 — OAIS-aligned preservation

The Media Vault remains the authoritative digital-object identity and storage lifecycle. OAIS packages do not create a second asset identity or a parallel asset lifecycle.

### Archival Information Package (AIP)

`public.oais_preservation_packages` stores immutable preservation manifests bound to `media_assets.id`.

An AIP includes:

- SHA-256 fixity digest and byte size.
- immutable manifest of authoritative asset metadata and storage references.
- Representation Information.
- Preservation Description Information (PDI), including provenance, reference/context and fixity information.
- package version and designated community.

Existing fixity-ready assets receive AIP v1 by controlled migration backfill. New versions are created through `admin_create_oais_aip`; packages are never updated in place.

### Preservation events

`public.oais_preservation_events` is append-only and records:

- AIP creation.
- fixity checks.
- DIP creation.
- future governed preservation migrations/notes.

Both package and event tables have mutation-blocking triggers.

### Fixity

`admin_verify_oais_fixity` compares an observed SHA-256 value with the immutable package digest and records success/failure without mutating the AIP. The verification result is also mirrored to the canonical governance audit stream.

### Dissemination Information Package (DIP)

`admin_create_oais_dip` creates an immutable dissemination package referencing its source AIP, designated community and dissemination purpose. It records dissemination evidence without changing the underlying Media Vault object.

### Operational API

`/api/admin/preservation`

- GET: staff preservation inventory.
- POST `create_aip`: verifier/admin only.
- POST `verify_fixity`: verifier/admin only.
- POST `create_dip`: verifier/admin only.
- state-changing requests require same-origin validation.

## Phase 8 — Formal conformance gate

`public.architecture_conformance_rules` is the machine-readable control registry.

`public.architecture_conformance_report()` evaluates the platform against these controls:

1. Lifecycle mapping coverage.
2. Zero-orphan referential integrity.
3. Retention policy coverage.
4. Audit immutability.
5. OAIS AIP coverage.
6. OAIS AIP manifest completeness.
7. OAIS preservation immutability.
8. Governance RLS coverage.
9. Unified workspace contract.

`public.architecture_conformance_summary` returns the baseline revision and overall state. A critical failure produces `NON_CONFORMANT`.

The UI rule is additionally enforced by source-level CI tests because database SQL cannot inspect React workspace structure.

### Operational API

`/api/admin/architecture-conformance` is staff-only and read-only. It returns the current rules, findings and overall conformance state.

## Architectural invariants

The following are now release-level invariants:

- one governed asset identity; no preservation orphan copies.
- one canonical lifecycle projection.
- zero unresolved governed relationships.
- immutable operational and preservation audit evidence.
- explicit retention coverage for all retention-applicable types.
- legal holds block destructive disposition.
- every fixity-ready asset must have an AIP.
- preservation packages are versioned, never edited in place.
- operational workspaces use the `master-detail-v1` contract.
- conformance failures remain machine-visible rather than being hidden by UI conventions.

## CI

`tests/wave-c-preservation-conformance.test.mjs` statically verifies the normative SQL/API/UI contracts on every `npm test` run. Existing runtime and source-contract tests continue to protect Wave A and Wave B behavior.
