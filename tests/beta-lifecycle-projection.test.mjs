import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projection = readFileSync("lib/beta-lifecycle-projection.ts", "utf8");
const reviewApi = readFileSync("app/api/admin/review/route.ts", "utf8");
const reviewUi = readFileSync("app/ui/admin/ReviewWorkspace.tsx", "utf8");
const migration = readFileSync("supabase/migrations/062_atomic_beta_feedback_transition.sql", "utf8");

test("Beta lifecycle projection exposes a revisioned server contract", () => {
  assert.match(projection, /BETA_LIFECYCLE_CONTRACT_REVISION\s*=\s*"beta\.lifecycle\.v1"/);
  for (const field of ["currentState", "availableActions", "blockedReasons", "validationRequirements", "confirmationMode", "requiredRoles", "retention"]) {
    assert.match(projection, new RegExp(field));
  }
});

test("Beta projection mirrors the operator transition surface", () => {
  assert.match(projection, /status === "new"/);
  assert.match(projection, /status === "triaged" \|\| status === "in_progress"/);
  assert.match(projection, /targetStatus: "triaged"/);
  assert.match(projection, /targetStatus: "resolved"/);
  assert.match(projection, /targetStatus: "duplicate"/);
});

test("Beta mutation is atomic, row-locked, staff-authorized and audited", () => {
  assert.match(migration, /create or replace function public\.admin_transition_beta_feedback/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /private\.is_staff\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /illegal_beta_feedback_transition/);
  assert.match(migration, /insert into public\.audit_events/);
  assert.match(migration, /beta_feedback_atomic_transition_v1/);
  assert.match(migration, /revoke all on function public\.admin_transition_beta_feedback\(uuid,text\) from public,anon/);
  assert.match(migration, /grant execute on function public\.admin_transition_beta_feedback\(uuid,text\) to authenticated/);
});

test("Review API projects Beta actions and enters the atomic RPC before generic mutation handling", () => {
  assert.match(reviewApi, /projectBetaLifecycle/);
  assert.match(reviewApi, /betaLifecycle\?: BetaLifecycleProjection/);
  assert.match(reviewApi, /rows\.beta = rows\.beta\.map/);
  assert.match(reviewApi, /betaLifecycle: projectBetaLifecycle\(row\.status\)/);
  assert.match(reviewApi, /if \(body\?\.table === "beta_feedback"\)/);
  assert.match(reviewApi, /rpc\/admin_transition_beta_feedback/);
  assert.doesNotMatch(reviewApi, /const allowedTables = \[[^\]]*"beta_feedback"/);
  const betaBoundary = reviewApi.indexOf('if (body?.table === "beta_feedback")');
  const genericPatch = reviewApi.indexOf('await adminRest(admin.token, `${table}?id=eq.${body.id}`');
  assert.ok(betaBoundary >= 0 && genericPatch > betaBoundary, "Beta RPC must return before the generic PATCH path");
});

test("Beta UI consumes projected actions instead of inferring status transitions", () => {
  assert.match(reviewUi, /row\.betaLifecycle\?\.availableActions/);
  assert.match(reviewUi, /runProjectedBetaAction\(row, action\)/);
  assert.match(reviewUi, /onSetStatus\("beta_feedback", row\.id, action\.targetStatus\)/);
  assert.match(reviewUi, /data-lifecycle-revision=\{row\.betaLifecycle\?\.contractRevision/);
  assert.doesNotMatch(reviewUi, /row\.status === "new"/);
  assert.doesNotMatch(reviewUi, /\["triaged", "in_progress"\]\.includes\(row\.status\)/);
  assert.doesNotMatch(reviewUi, /onSetStatus\("beta_feedback", row\.id, "triaged"\)/);
  assert.doesNotMatch(reviewUi, /onSetStatus\("beta_feedback", row\.id, "resolved"\)/);
  assert.doesNotMatch(reviewUi, /onSetStatus\("beta_feedback", row\.id, "duplicate"\)/);
});
