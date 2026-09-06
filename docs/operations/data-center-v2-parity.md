# Data Center V2 — Functional parity and cutover matrix

Base: `main@3030fbf30f2066d43c6b44aeffeaa3b04b46e972`
Route: `/operations/data-center-v2`
Legacy policy: **freeze, do not extend** until controlled cutover.
Backend policy: reuse existing APIs/RPCs; no migration or schema change in this rebuild.

| Capability | Legacy source | V2 implementation | Status |
| --- | --- | --- | --- |
| Baghdad CSV intake | `DataCenterWorkspace` | V2 Intake → `stage_csv` | PARITY PASS |
| Single organization intake | `DataCenterWorkspace` | V2 Intake → `create_manual_draft` | PARITY PASS |
| Import batch preview | `DataCenterWorkspace` | V2 Batches → batch detail GET | PARITY PASS |
| Import lifecycle | `DataCenterWorkspace` | `data-import.lifecycle.v1` projected actions only | PARITY PASS |
| Product master draft | `CatalogDraftWorkspace` | V2 Catalog → `RecordForm` capability contract + product draft v2 | PARITY PASS |
| Seller offer draft | `CatalogDraftWorkspace` | V2 Catalog → canonical product + organization selectors | PARITY PASS |
| Organization draft | `CatalogDraftWorkspace` | V2 Catalog → structured organization form | PARITY PASS |
| Brand draft | `CatalogDraftWorkspace` | V2 Catalog → structured brand form | PARITY PASS |
| Origin claim draft | `CatalogDraftWorkspace` | V2 Catalog → product/country/region selectors | PARITY PASS |
| Content draft | `CatalogDraftWorkspace` | V2 Catalog → structured content form | PARITY PASS |
| Source provenance | legacy forms | required source block on every V2 catalog form | PARITY PASS |
| Manual UUID linking | legacy/historical pattern | no V2 identifier text field | INTENTIONALLY REMOVED |
| Generic entity-type picker | legacy/historical pattern | entity-specific forms/handoffs only | INTENTIONALLY REMOVED |
| Review decisions | Review workspace | governed handoff to Review; no duplicated authority | PARITY BY OWNER |
| Media assignment | Media Vault / Review | governed handoff; no duplicated Media lifecycle | PARITY BY OWNER |
| Search governance | Search workspace | governed handoff | PARITY BY OWNER |
| Support technical tasks | Support workspace | governed handoff | PARITY BY OWNER |
| Archive | Archive workspace | governed handoff | PARITY BY OWNER |
| Taxonomy | Taxonomy workspace | governed handoff | PARITY BY OWNER |
| Customer-facing verification | not continuous in legacy Data Center | read-only public products/directory/search watchdog | V2 IMPROVEMENT |

## Cutover invariants

1. V2 never imports `DataCenterWorkspace` or `CatalogDraftWorkspace`.
2. V2 never asks an operator to type a canonical UUID.
3. Product master and seller offer fields remain separated.
4. All creates are draft-only and keep current review/publication authority unchanged.
5. Batch lifecycle buttons originate only from `data-import.lifecycle.v1`.
6. All catalog reference values come from the server data-center/reference or record-capability contracts.
7. Public parity probes are GET/read-only and cannot publish or mutate.
8. Old route/components remain frozen until V2 has clean-head CI and post-merge validation.

## Final cutover sequence

1. `data-center.v2.conformance.v1` source tests green.
2. Permanent Quality Gate green on clean PR head.
3. Merge V2 route while legacy remains frozen and available as rollback.
4. Verify post-merge CI and production route/session loading.
5. Point the Operations Data Center navigation to `/operations/data-center-v2` in a controlled cutover commit.
6. Observe customer-facing watchdog and operator smoke paths.
7. Remove legacy Data Center composition only in a separate cleanup PR after the rollback window.
