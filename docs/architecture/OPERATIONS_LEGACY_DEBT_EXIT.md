# Operations Legacy Debt Exit Boundary

Status: ACTIVE CLEANUP RECORD  
Scope: `/operations` physical decomposition and legacy `Platform.tsx` retirement

## Current production ownership

`/operations` is owned by `app/operations/page.tsx` and renders `OperationsController`, which composes the governed workspaces through `OperationsWorkspaceShell`.

The active Operations UI no longer depends on:

- `Platform.tsx` imports
- `GovernedOperationsBridge`
- `PendingAssetReviewBridge`
- `MediaPreservationBridge`
- `MutationObserver`
- `createPortal`

Architecture, workspace composition, pending asset review, and OAIS preservation are all direct React composition in the dedicated Operations tree.

## Remaining legacy debt

`app/ui/Platform.tsx` still contains an old `function Operations()` implementation and legacy helper implementations that were extracted to `app/ui/admin/*` during the Phase 6 cutover. `Platform.tsx` also retains a historical page definition with `path: "/operations"` / `kind: "operations"` and a catch-all rendering branch for that kind.

These paths are shadowed by the dedicated static `/operations` route and are not the production owner of Operations. They must not be treated as a fallback architecture.

## Safe deletion sequence

1. Remove the historical `/operations` page definition from the `pages` registry in `Platform.tsx`.
2. Remove the `page.kind === "operations"` branch from the catch-all renderer.
3. Remove `function Operations()`.
4. Remove legacy helpers that become unused after step 3, one group at a time.
5. Remove admin-only imports from `Platform.tsx` after TypeScript confirms they are no longer referenced.
6. Run the full Quality Gate after every deletion batch.

## Exit criteria

The cleanup is complete when:

- `Platform.tsx` contains no `function Operations()`.
- `Platform.tsx` contains no `kind: "operations"` page definition or operations render branch.
- `Platform.tsx` has no imports from `app/ui/admin/*` that exist only for the old Operations implementation.
- `/operations` continues to build as a dedicated route.
- `tests/operations-route-isolation.test.mjs` remains green.
- Full CI is green.

This record describes implementation ownership only. It does not claim ISO certification; the platform remains aligned with its declared DAMA-DMBOK / ISO 15489 / OAIS architecture baseline and machine-readable conformance controls.
