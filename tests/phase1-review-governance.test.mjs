import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
const partner = readFileSync(new URL("../app/ui/partner/PartnerPortal.tsx", import.meta.url), "utf8");
const review = readFileSync(new URL("../app/ui/admin/ReviewWorkspace.tsx", import.meta.url), "utf8");
const controller = readFileSync(new URL("../app/ui/admin/OperationsController.tsx", import.meta.url), "utf8");
const dialog = readFileSync(new URL("../app/ui/admin/StandardConfirmDialog.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../app/ui/admin/OperationsWorkspaceShell.tsx", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/admin/review/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/056_phase1_atomic_review_transition.sql", import.meta.url), "utf8");

test("legacy Operations runtime is physically absent while partner routing remains explicit", () => {
  assert.doesNotMatch(platform, /function Operations\(\)/);
  assert.doesNotMatch(platform, /type DataCenterBatch = \{/);
  assert.doesNotMatch(platform, /operations-workspace-nav/);
  assert.match(platform, /else if \(page\.kind === "partner"\) body = <PartnerPortal \/>/);
  assert.match(partner, /export function PartnerPortal\(\)/);
});

test("operations shell does not regress the unsupported ARIA description attribute", () => {
  assert.doesNotMatch(shell, /aria-description=/);
  assert.match(shell, /aria-label=/);
});

test("Review and Approval uses the standard confirmation boundary instead of browser prompts", () => {
  assert.doesNotMatch(review, /window\.(prompt|confirm)/);
  assert.match(controller, /<StandardConfirmDialog/);
  assert.match(controller, /requestAdminOverride/);
  assert.match(controller, /requiredValue: "حذف"/);
  assert.match(controller, /minLength: 10/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /aria-labelledby=/);
  assert.match(dialog, /aria-describedby=/);
});

test("core Review lifecycle mutations cross the atomic RPC boundary", () => {
  const rpcIndex = route.indexOf('"rpc/admin_transition_review_record"');
  assert.ok(rpcIndex > 0);
  const directPatchIndex = route.indexOf('method: "PATCH"', rpcIndex);
  assert.ok(directPatchIndex > rpcIndex, "legacy generic PATCH may remain only after the core RPC early-return branch");
  const rpcSlice = route.slice(rpcIndex - 500, directPatchIndex);
  assert.match(rpcSlice, /products.*brands.*organizations.*offers.*contents.*origin_claims/s);
  assert.match(rpcSlice, /return Response\.json\(\{ updated: true/);
});

test("atomic Review migration locks state, validates authority, and writes audit in one function", () => {
  assert.match(migration, /create or replace function public\.admin_transition_review_record/);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /private\.is_staff/);
  assert.match(migration, /illegal_review_transition/);
  assert.match(migration, /insert into public\.audit_events/);
  assert.match(migration, /review_atomic_transition_v1/);
  assert.match(migration, /revoke all on function public\.admin_transition_review_record/);
});
