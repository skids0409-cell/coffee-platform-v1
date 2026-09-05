# Wave B — Unified Operator Experience

Status: implementation baseline for Enterprise Architecture Specification v1.0.

## Phase 5 — Shared Frontend Governance Contract

The platform uses one governed interaction grammar for operational workspaces:

`Workspace Header -> Queue / Master -> Contextual Inspector -> Relationships -> Audit -> Governed Actions`

The shared implementation lives in `app/ui/admin/governance/GovernedWorkspace.tsx` and exposes the mandatory primitives for lifecycle status, master-detail layout, inspector, relationships, audit, retention/legal hold and transition actions.

The design layer is intentionally transport-free: it performs no database or API mutations. Existing backend RPC/domain boundaries remain authoritative.

## Phase 6 — Incremental Workspace Refactor

Wave B adopts a strangler-style migration rather than a big-bang rewrite of `Platform.tsx`.

- Media Vault is already an extracted workspace component and is registered under the `media` governed workspace contract.
- Pending Asset Review remains an extracted client console and is projected into Review & Approval while the parent Review workspace is still being decomposed.
- Records and Entity Management share the `records` contract; their existing list surface is marked as the Master region and the existing record editor is treated as the Contextual Inspector.
- Review & Approval is registered under the same contract and retains its existing governed actions and role checks.
- `GovernedOperationsBridge` is the temporary compatibility boundary. It adds no mutation path and makes no network request. It only projects shared workspace semantics onto existing operational surfaces.

This leaves `Platform.tsx` as a compatibility/orchestration host during incremental decomposition, not as the source of the new UI standard. New governed workspaces must use the shared contract directly rather than introduce new isolated layouts.

## Safety Rules

1. Backend lifecycle state remains authoritative.
2. The compatibility bridge MUST NOT call APIs or mutate records.
3. Existing backend endpoints and role checks remain unchanged during UI migration.
4. A legacy workspace may be physically extracted only after parity tests exist for its current behavior.
5. Pending Asset Review bridge removal is allowed only after the parent Review workspace has its own stable extracted host.
6. Direct destructive actions may not be added by shared UI components; they must invoke existing governed domain transitions.

## Current Conformance Surface

| Workspace | Governed Contract | Master | Inspector | Status |
|---|---|---|---|---|
| Media Vault | `media` / `master-detail-v1` | Asset list | Media Vault inspector | Migrated/extracted |
| Review & Approval | `review` / `master-detail-v1` | Review queues + asset queue | Record/asset inspectors | Contract-adapted, incremental extraction |
| Records | `records` / `master-detail-v1` | Published record list | Record editor | Contract-adapted, incremental extraction |
| Entities | `records` / `master-detail-v1` | Entity rows inside governed records workspace | Record editor | Unified with Records |

## Conformance Gate

`tests/wave-b-governed-workspaces.test.mjs` blocks regressions by asserting the shared primitives, bridge mounting, workspace identities, inspector projection and the absence of network/mutation behavior in the UI contract layer.
