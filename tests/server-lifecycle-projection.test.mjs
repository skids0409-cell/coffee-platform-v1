import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const projection = read("../lib/review-lifecycle-projection.ts");
const reviewRoute = read("../app/api/admin/review/route.ts");
const reviewWorkspace = read("../app/ui/admin/ReviewWorkspace.tsx");
const atomicMigration = read("../supabase/migrations/056_phase1_atomic_review_transition.sql");

test("Review lifecycle projection exposes a revisioned server contract", () => {
  assert.match(projection, /REVIEW_LIFECYCLE_CONTRACT_REVISION\s*=\s*"review\.lifecycle\.v1"/);
  assert.match(projection, /currentState:\s*string/);
  assert.match(projection, /availableActions:\s*ReviewLifecycleAction\[\]/);
  assert.match(projection, /blockedReasons:\s*string\[\]/);
  assert.match(projection, /validationRequirements:\s*string\[\]/);
  assert.match(projection, /confirmationMode:\s*ReviewConfirmationMode/);
  assert.match(projection, /legalHold:\s*boolean \| null/);
  assert.match(projection, /reason:\s*"not_projected_in_review_v1"/);
});

test("Review server projects action availability from state readiness and staff role", () => {
  assert.match(reviewRoute, /projectReviewLifecycle/);
  assert.match(reviewRoute, /async function loadQueue\(token: string, role: string\)/);
  assert.match(reviewRoute, /const governedReviewKeys = \["products", "brands", "organizations", "offers", "contents", "origins"\]/);
  assert.match(reviewRoute, /lifecycle: projectReviewLifecycle\(\{ status: row\.status, ready: row\.ready, blockers: row\.blockers, role \}\)/);
  assert.match(reviewRoute, /loadQueue\(admin\.token, admin\.profile\.role\)/);
});

test("core Review UI consumes projected actions instead of inferring them from status or role", () => {
  assert.match(reviewWorkspace, /row\.lifecycle\?\.availableActions/);
  assert.match(reviewWorkspace, /data-lifecycle-revision=\{row\.lifecycle\?\.contractRevision/);
  assert.match(reviewWorkspace, /data-confirmation-mode=\{action\.confirmationMode\}/);
  assert.match(reviewWorkspace, /title=\{action\.blockedReason \|\| ""\}/);
  assert.match(reviewWorkspace, /runProjectedAction\(key, row, action\)/);

  assert.doesNotMatch(reviewWorkspace, /row\.status === "draft" && <button/);
  assert.doesNotMatch(reviewWorkspace, /row\.status === "in_review" && canVerify/);
  assert.doesNotMatch(reviewWorkspace, /\["in_review", "rejected"\]\.includes\(row\.status\)/);
  assert.doesNotMatch(reviewWorkspace, /row\.status !== "published" && role === "admin"/);
});

test("projected actions preserve server mutation authority", () => {
  assert.match(reviewWorkspace, /onSetStatus\(entity, row\.id, action\.targetStatus\)/);
  assert.match(reviewWorkspace, /onAdminOverride\(entity, row\.id, row\.label\)/);
  assert.match(reviewWorkspace, /onDeleteRecord\(entity, row\.id, row\.label\)/);
  assert.match(reviewRoute, /rpc\/admin_transition_review_record/);
  assert.match(atomicMigration, /security invoker/i);
  assert.match(atomicMigration, /for update/i);
  assert.match(atomicMigration, /insert into public\.audit_events/);
});
