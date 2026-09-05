# Wave A — Phase 0 Architecture Inventory & Gap Register

**Baseline:** Enterprise Architecture Specification v1.0  
**Scope:** DAM / Media Vault, Records, Entities, Intake, Review, Retention, Legal Hold, Disposal  
**Inventory baseline commit:** `24942b5e36503043e5a7f27eff110a8681e2c74d`  
**Status:** Phase 0 complete; Phase 1 implementation may proceed additively.

## 1. Current-state architecture inventory

### A. DAM / Media Vault

The DAM domain is the most mature governed lifecycle implementation in the platform.

Observed controls:
- `media_assets` stores technical status, publication status, legal hold, quarantine and retention timestamps.
- `media_asset_lifecycle` is an authoritative derived lifecycle projection.
- `media_asset_links` and `entity_media` represent governed asset/entity relationships.
- `media_ingestion_events` provides lifecycle/ingestion traceability.
- `media_purge_requests` and `media_asset_disposal_audit` provide governed disposal workflow and durable disposition evidence.
- target-integrity triggers and delete guards exist for governed media relationships.
- ingestion traceability is enforced by `ensure_media_asset_traceability`.
- lifecycle-changing media operations already use dedicated RPCs such as `admin_media_review_pending_asset`, `admin_media_vault_action`, publication RPCs and purge RPCs.

Current derived DAM lifecycle vocabulary includes:
- `pending_technical_audit`
- `technical_rejected`
- `duplicate_review`
- `pending_approval`
- `active`
- `legal_hold`
- `quarantine_retention`
- `disposal_eligible`
- `disposal_requested`
- `disposal_approved`
- `disposal_executing`

### B. Entity / catalog records

Primary governed entity tables include:
- `products`
- `organizations`
- `brands`
- `offers`
- `contents`
- `origin_claims`

Most use the shared PostgreSQL enum `publication_status`:
- `draft`
- `in_review`
- `published`
- `archived`
- `rejected`

Relationships are structurally strong in many places through foreign keys, including product/brand/organization/source relationships. Media polymorphic relationships are additionally protected by target-integrity guards.

### C. Records / provenance

`source_records` is the principal evidence/provenance record table. It contains source identity, publisher, URL, access date, license note, evidence excerpt, checksum and creator metadata.

Important current-state gap: `source_records` has no explicit lifecycle/status column. Its existence currently means that the source has been captured, but retention/disposition is not expressed as a canonical lifecycle state.

The Operations Records API supports six entity classes. Product editing already uses the atomic `admin_update_product_v2` RPC contract. Other entity edits still contain generic REST table PATCH/DELETE patterns and application-written audit rows. These paths are an explicit Phase 2 transition-boundary gap; they are not changed during Phase 0/1.

### D. Intake / data quality

`data_import_batches` uses text states such as `draft`, `imported`, `archived`.

`data_intake_rows.validation_status` uses a different vocabulary, including `pending`, `warning`, `invalid`, `imported` by schema/design; production currently contains `warning`, `invalid`, and `imported`.

`data_quality_issues` has its own issue-resolution status workflow.

### E. Review / submissions / cases

Additional independent workflow vocabularies exist for:
- `partner_submissions`
- `listing_claims`
- `rights_requests`
- `media_rights_assertions`
- `media_legal_cases`
- `support_requests`

These workflows are legitimate domain substates, but they are not yet registered against one enterprise canonical lifecycle vocabulary.

### F. Audit

Two important audit mechanisms currently coexist:
1. general `audit_events` for catalog/record changes;
2. specialized media event/audit tables (`media_ingestion_events`, legal-case events, disposal audit).

This is functionally useful but the audit envelope is not yet globally normalized. Phase 4 remains responsible for a unified append-only event contract.

### G. Retention / legal hold

Media has explicit `legal_hold`, `quarantine_started_at` and `retention_expires_at`, plus purge/disposal controls. `verification_evidence` also has `retention_until`.

Equivalent retention/hold semantics are not yet uniformly available for Records and Entities. This remains a Phase 4 gap.

## 2. Mutation-path inventory

### Already governed by explicit RPC/domain transitions
- media ingestion and validation
- media review/approval
- media publication preparation/finalization/cancellation
- media quarantine/restore/unlink/disposal actions
- media purge preparation/finalization/failure
- product atomic update contract
- taxonomy administrative RPC flows

### Known generic/direct mutation paths requiring later remediation
- record edits for organizations
- record edits for brands
- record edits for offers
- record edits for contents
- record edits for origin claims
- selected issue/status updates through generic REST mutation

**Rule:** These paths are frozen as known debt. Phase 1 MUST NOT silently rewrite them; Phase 2 will move lifecycle-significant mutations behind governed transition boundaries.

## 3. Relationship / zero-orphan inventory

Strengths:
- broad use of relational foreign keys with restrictive parent relationships;
- media asset FK from `entity_media` to `media_assets` is `ON DELETE RESTRICT`;
- polymorphic entity-media targets are checked by triggers/functions;
- active media relationships block unsafe quarantine/deletion paths.

Gaps:
- not every polymorphic relationship type is centrally registered;
- enterprise-wide zero-orphan conformance is not yet automatically tested from one registry;
- lifecycle-dependent relationship semantics are strongest in DAM and not yet generalized across all domains.

## 4. Phase 0 Gap Register

| ID | Gap | Severity | Wave A owner phase | Safe remediation |
|---|---|---:|---|---|
| WA-G01 | Multiple lifecycle vocabularies with no canonical registry | P0 | Phase 1 | Add canonical registry + mappings without changing legacy columns |
| WA-G02 | No common governed-object envelope across DAM/Records/Entities | P0 | Phase 1 | Add read-only normalized envelope projection |
| WA-G03 | Direct REST mutations exist for lifecycle-capable entity records | P0 | Phase 2 | Wrap/replace with transactional RPC/domain transitions |
| WA-G04 | Relationship types are not centrally registered | P0 | Phase 1/3 | Create object/relationship registry, then enforce in Phase 3 |
| WA-G05 | Zero-orphan enforcement is not proven globally | P0 | Phase 3 | Registry-driven constraints/guards + reconciliation tests |
| WA-G06 | General and media audit envelopes differ | P1 | Phase 4 | Introduce common append-only governance event envelope |
| WA-G07 | Retention/legal-hold semantics are DAM-heavy | P1 | Phase 4 | Add cross-domain retention/hold policy model |
| WA-G08 | `source_records` has no explicit lifecycle | P1 | Phase 1/4 | Canonically project existing records as `INGESTED`; introduce controlled lifecycle later |
| WA-G09 | UI lifecycle vocabulary can still diverge by module | P1 | Wave B | Consume canonical lifecycle projection in shared workspace components |
| WA-G10 | Architecture contracts are not yet CI-enforced globally | P0 | Phase 1/8 | Add source contract now; expand invariant tests through later phases |

## 5. Phase 0 decisions

1. **No destructive schema rewrite in Wave A Phase 1.** Existing enums/status fields remain intact.
2. **Canonicalization is additive.** A registry and mapping layer becomes the enterprise vocabulary while legacy values continue operating.
3. **Backend remains authoritative.** Canonical phase is derived from server/database state.
4. **Object Envelope is a projection, not a duplicate master table.** It normalizes identity/lifecycle/provenance without copying business data.
5. **Phase 1 is not a claim of full conformance.** It establishes the governance kernel required for Phases 2–4.

## 6. Phase 0 exit criteria

- [x] Core lifecycle/status columns inventoried.
- [x] DAM lifecycle and disposal controls inventoried.
- [x] Primary entity/record/intake vocabularies inventoried.
- [x] Foreign-key and media polymorphic integrity controls inventoried.
- [x] Explicit transition RPCs identified.
- [x] Known generic mutation paths identified as Phase 2 debt.
- [x] Audit/retention fragmentation documented.
- [x] Gap Register established with owner phase and priority.

**Phase 0 result: COMPLETE.**
