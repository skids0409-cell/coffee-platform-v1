# Phase 5 - Unified Operational Work Queue Contract

Status: approved architecture, implementation not started.

## Boundary

Phase 5 adds one server-owned read projection across:

- `data_quality_issues`
- `rights_requests`
- `support_requests`
- `partner_submissions`

The source tables remain authoritative and independent. Phase 5 must not create
a universal workflow table or copy source-domain status into a replacement
status column.

## Projection

Each projected work item must contain:

- Stable work-item type and source identifier.
- Source table and source record ID.
- Public reference where available.
- Subject and concise summary.
- Priority.
- Normalized display status.
- Original source-domain status.
- Assigned staff member where supported by the source domain.
- Created and last-updated timestamps.
- Deep link to the authoritative workspace/editor.

The projection key is `(work_item_type, source_id)`. Every source request must
appear exactly once.

## Mutation Rules

- The queue is read-only.
- Opening an item routes to its authoritative domain editor.
- Updates use the existing domain-specific API and RLS policy.
- No generic queue mutation may update more than one source domain.
- Normalized display status never overwrites the source status.
- Every accepted source mutation produces its normal domain audit event.

## Access Rules

- Staff visibility is enforced by the source tables and their RLS policies.
- The projection must use PostgreSQL `security_invoker` semantics.
- `anon` receives no queue access.
- Partner access remains limited to the existing partner domain.

## Gate

Phase 5 passes only when:

- Every eligible source row appears exactly once.
- No source-domain status is modified by projection refresh or reads.
- Every deep link opens the authoritative editor.
- The permission matrix passes for admin, verifier, editor, partner and anon.
- No generic mutation endpoint exists.
