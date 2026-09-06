# Master & Vendor Catalog Governance v2.0 — Baseline Mapping

Status: Phase 7 working baseline
Base: `main@d14a953e3891b8cf9679bf85c374fe672c168b68`
Branch: `phase7/master-vendor-catalog-governance-v2`

## Scope discipline

This document is the implementation baseline for the final catalog-governance phase. It does **not** alter the already-certified platform-conformance controls. Catalog changes must preserve server-authoritative actions, atomic lifecycle boundaries, append-only audit, zero-orphan relationships, partner isolation, Media Vault lifecycle controls, and the permanent CI gate.

The exact source artifact titled **Master & Vendor Catalog Governance (v2.0)** is not currently present in the repository or available project-file index. Therefore this baseline records only requirements that are already explicit in the Baghdad release directive and facts verified in the current schema/runtime. Any clause-specific mapping from the source document must be appended only from the authoritative document; no missing clause is inferred here.

## Verified current-state catalog model

### Master product identity

`public.products` is the canonical product/master table. Its current identity and descriptive scope includes:

- canonical product `id` and `slug`
- Arabic/English names and descriptions
- `product_kind`
- `brand_id`
- `owner_organization_id`
- `model_number`
- `verification_tier`
- publication lifecycle status
- source-checked/published/archive timestamps

The schema already enforces a partial duplicate guard on `(brand_id, lower(model_number))` for non-archived products.

### Master classification and specification

Master product classification/specification is held outside seller offers through:

- `product_categories`
- `package_options`
- `product_attribute_values`
- product-specific specification tables
- canonical source records

This is consistent with the existing UI rule that product identity/specification is not the seller's price/listing scope.

### Vendor / seller commercial scope

`public.offers` is the current seller-scoped commercial relation. It references:

- `product_id` → canonical master product
- optional `package_option_id`
- `seller_organization_id`
- `market_id`
- price/currency
- availability
- seller evidence URL
- observation/expiry timestamps
- source record
- independent publication lifecycle

This establishes a strong starting boundary: **seller offers reference a master product; they are not independent product masters**.

### Partner approval side-effects

The atomic partner decision RPC already classifies partner submissions by entity type:

- `product_offer` → calls `admin_create_catalog_draft('offer', ...)` with the partner organization forced into `seller_organization_id`.
- `new_product` → calls `admin_create_product_draft_v2(...)` with the partner organization forced into `owner_organization_id`.

Both paths create **draft canonical records**, not published records, and the partner transition is row-locked and audited atomically. This preserves server authority, but it also identifies the first v2.0 governance seam: one partner-review approval currently authorizes creation of either a master draft or vendor-offer draft. The v2.0 dual-verification contract must explicitly define what additional independent verification is required before either record can become publication-eligible.

## Governance requirements already explicit for v2 rollout

### G-01 — Master / Vendor separation is mandatory

A vendor/seller must not create a parallel canonical product identity merely to publish a price, availability state, or seller-specific evidence. Seller-specific data must remain scoped to vendor commercial records linked to a canonical master.

**Current fit:** strong structural fit through `products` + `offers`.

**Required audit:** all intake APIs, partner submission approval side-effects, admin draft creation, import flows, and UI entry points must be checked for bypass paths that can duplicate a master rather than attach a vendor record.

### G-02 — Canonical identity requires duplicate prevention beyond UI

Canonical product identity must be protected at the server/database boundary. Existing `(brand_id, model_number)` protection is useful but not sufficient for records where model numbers are absent, inconsistent, localized, or seller-provided.

**Required design work:** define normalized identity keys per `product_kind`, with evidence-backed exception/merge workflow rather than blind duplicate insertion.

### G-03 — Vendor listing must resolve to a valid master

A vendor commercial record must not exist as a published orphan. Its `product_id` and seller organization must remain valid, governed relationships.

**Current fit:** relational FKs already prevent raw orphan references.

**Required audit:** publication eligibility must also verify the target master and seller are in acceptable lifecycle states, rather than relying on FK existence alone.

### G-04 — Dual verification must be server-enforced

The v2 rollout requires dual verification for catalog integrity. No client role check or locally inferred action may substitute for server authority.

The implementation design must distinguish at minimum:

1. **Master verification** — identity/specification/source quality of the canonical product.
2. **Vendor verification** — seller ownership/authority, commercial evidence, current price/availability, and correct linkage to the master.

The two approvals must be independently auditable and must not collapse into one browser/UI confirmation.

**Verified seam:** partner review currently creates the downstream master/vendor draft after one verifier/admin approval. This is acceptable as controlled intake, but must not count as completion of both v2.0 verification domains unless the authoritative document explicitly says so.

**Open design decision:** exact role separation, independence rule, and whether the same verifier may satisfy both checks must come from the authoritative v2.0 document before migration code is written.

### G-05 — Publication must consume verification state, not infer it

Master and vendor publication eligibility must be projected by the server from authoritative lifecycle, evidence, relationship, and verification state. UI may display allowed actions but must not calculate governance authority locally.

### G-06 — Vendor changes must not mutate master truth silently

Price, availability, vendor evidence, vendor media, and seller-specific package/listing details must not overwrite canonical master identity/specification without entering an explicit master-change proposal/review path.

### G-07 — Master correction must propagate safely

When a canonical master changes, vendor records must remain linked by stable ID. Corrections/merges must preserve audit lineage and prevent silent seller-record orphaning or reassignment.

### G-08 — Source provenance is first-class

Master facts and vendor commercial facts must retain source/evidence appropriate to their ownership domain. Vendor evidence cannot automatically establish canonical manufacturer/master truth; manufacturer/master evidence cannot automatically establish current vendor price/availability.

### G-09 — Media ownership/scope must remain explicit

Master product media and vendor/seller media must remain distinguishable while continuing to use the governed Media Vault lifecycle. Unlink/purge/legal-hold behavior must not regress.

### G-10 — Partner submissions remain proposals, not direct authority

Partner/vendor submissions must enter governed review and atomic approval boundaries. A partner submission cannot become canonical master truth or a published vendor listing solely from client-side intent.

## Initial gap register

| ID | Area | Current state | Risk / question | Next verification |
|---|---|---|---|---|
| C-01 | Product identity | `products` canonical; brand/model partial uniqueness | products without reliable model numbers can duplicate | inspect all product-kind identity rules and duplicate APIs |
| C-02 | Seller scope | `offers` references product + seller | need explicit publication eligibility against master/seller lifecycle | inspect offer create/review RPCs and public-offer query |
| C-03 | Dual verification | general verification tiers and lifecycle exist | no verified evidence yet of a two-check master/vendor contract | map source v2.0 clauses before DDL |
| C-04 | Partner approval | `product_offer` creates offer draft; `new_product` creates master draft inside atomic partner approval | one partner-review approval currently authorizes controlled draft creation in either domain; v2.0 must define the independent verification still required before publication | trace both draft types into review/publication projections and map the authoritative v2.0 independence clause |
| C-05 | Catalog intake | governed draft/record APIs exist | duplicate/master resolution may vary by intake path | inventory every create path |
| C-06 | Media | Media Vault governed | need enforceable master-media vs vendor-media semantic scope | inspect entity media role contracts |
| C-07 | Audit | canonical audit streams exist | dual verification needs distinct auditable decisions | design only after source-clause confirmation |
| C-08 | Merge/correction | record governance exists | canonical merge/supersession semantics not yet certified | inspect schema and propose no-orphan merge contract |

## Mandatory implementation sequence

1. Obtain/locate the authoritative v2.0 requirement source and create a clause-by-clause traceability matrix.
2. Inventory all master-creation and vendor-listing creation/mutation paths on the stable main baseline.
3. Classify each field and relationship as `MASTER_OWNED`, `VENDOR_OWNED`, `SHARED_REFERENCE`, or `EVIDENCE_ONLY`.
4. Define server projection contracts for master and vendor eligibility/actions.
5. Define the dual-verification state machine and independence constraints from the authoritative document.
6. Implement database constraints/RPCs before enabling UI actions.
7. Add conformance tests proving:
   - no vendor-to-master overwrite bypass
   - no published vendor orphan
   - no local authority inference
   - dual verification cannot be bypassed
   - partner submissions cannot self-publish
   - merge/correction preserves all vendor links and audit lineage
8. Run clean-head CI and merge only after all permanent gates remain green.

## Hard stop conditions

Do not create a universal catalog workflow table, generic mutation endpoint, or client-computed authorization layer. Do not encode undocumented v2.0 role/independence rules until the authoritative source text is available.
