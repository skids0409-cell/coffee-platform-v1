import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projection = readFileSync("lib/rights-lifecycle-projection.ts", "utf8");
const reviewApi = readFileSync("app/api/admin/review/route.ts", "utf8");
const reviewUi = readFileSync("app/ui/admin/ReviewWorkspace.tsx", "utf8");
const rightsMigration = readFileSync("supabase/migrations/057_atomic_rights_request_transition.sql", "utf8");

test("Rights lifecycle projection exposes a revisioned server contract", () => {
  assert.match(projection, /RIGHTS_LIFECYCLE_CONTRACT_REVISION\s*=\s*"rights\.lifecycle\.v1"/);
  for (const field of ["currentState", "availableActions", "blockedReasons", "validationRequirements", "confirmationMode", "requiredRoles", "retention"]) {
    assert.match(projection, new RegExp(field));
  }
});

test("Rights projection mirrors the governed transition surface without client role inference", () => {
  assert.match(projection, /status === "submitted"/);
  assert.match(projection, /status === "needs_evidence"/);
  assert.match(projection, /status === "in_review"/);
  assert.match(projection, /targetStatus: "in_review"/);
  assert.match(projection, /targetStatus: "needs_evidence"/);
  assert.match(projection, /targetStatus: "approved"/);
  assert.match(projection, /targetStatus: "rejected"/);
  assert.match(projection, /confirmationMode: "reason_required"/);
  assert.match(rightsMigration, /v_current='submitted' and p_next_status in \('in_review','needs_evidence'\)/);
  assert.match(rightsMigration, /v_current='needs_evidence' and p_next_status='in_review'/);
  assert.match(rightsMigration, /v_current='in_review' and p_next_status in \('needs_evidence','approved','rejected','closed'\)/);
});

test("Review API attaches Rights actions using server-side state and staff role", () => {
  assert.match(reviewApi, /projectRightsLifecycle/);
  assert.match(reviewApi, /rightsLifecycle\?: RightsLifecycleProjection/);
  assert.match(reviewApi, /rows\.rights = rows\.rights\.map/);
  assert.match(reviewApi, /projectRightsLifecycle\(\{ status: row\.status, role \}\)/);
});

test("Rights UI consumes projected actions instead of inferring them from status or role", () => {
  assert.match(reviewUi, /row\.rightsLifecycle\?\.availableActions/);
  assert.match(reviewUi, /data-lifecycle-revision=\{row\.rightsLifecycle\?\.contractRevision/);
  assert.match(reviewUi, /onProcessRights\(row\.id, action\.targetStatus\)/);
  assert.doesNotMatch(reviewUi, /const canVerify =/);
  assert.doesNotMatch(reviewUi, /row\.status !== "in_review"/);
  assert.doesNotMatch(reviewUi, /row\.status !== "needs_evidence"/);
  assert.doesNotMatch(reviewUi, /row\.status === "in_review"/);
});

test("Rights final decisions remain behind the existing governed confirmation callback", () => {
  assert.match(reviewUi, /data-confirmation-mode=\{action\.confirmationMode\}/);
  assert.match(projection, /action: "approve"[\s\S]*confirmationMode: "reason_required"/);
  assert.match(projection, /action: "reject"[\s\S]*confirmationMode: "reason_required"/);
});
