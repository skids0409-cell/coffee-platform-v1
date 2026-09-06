import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projection = readFileSync("lib/support-lifecycle-projection.ts", "utf8");
const reviewApi = readFileSync("app/api/admin/review/route.ts", "utf8");
const supportUi = readFileSync("app/ui/admin/SupportWorkspace.tsx", "utf8");
const controller = readFileSync("app/ui/admin/OperationsController.tsx", "utf8");
const migration = readFileSync("supabase/migrations/058_atomic_support_request_boundaries.sql", "utf8");

test("Support lifecycle projection exposes a revisioned server contract", () => {
  assert.match(projection, /SUPPORT_LIFECYCLE_CONTRACT_REVISION\s*=\s*"support\.lifecycle\.v1"/);
  for (const field of ["currentState", "statusOptions", "availableActions", "blockedReasons", "validationRequirements", "confirmationMode", "requiredRoles", "retention"]) {
    assert.match(projection, new RegExp(field));
  }
});

test("Support projection preserves the established status surface and server-projects operational action gates", () => {
  for (const status of ["new", "triaged", "in_progress", "waiting_user", "resolved", "closed", "spam", "archived"]) {
    assert.match(projection, new RegExp(`value: "${status}"`));
  }
  assert.match(projection, /const canArchive = input\.status === "resolved" \|\| input\.status === "closed"/);
  assert.match(projection, /const canDelete = input\.role === "admin" && input\.status === "archived"/);
  assert.match(projection, /const hasPhone = Boolean\(input\.requesterPhone\?\.trim\(\)\)/);
  assert.match(projection, /const hasResolution = \(input\.resolutionNote\?\.trim\(\)\.length \|\| 0\) >= 3/);
});

test("Support mutations remain atomic, row-locked, staff-authorized and audited", () => {
  assert.match(migration, /create or replace function public\.admin_update_support_request/);
  assert.match(migration, /create or replace function public\.admin_mark_support_event/);
  assert.match(migration, /create or replace function public\.admin_delete_archived_support_request/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /for update/);
  assert.match(migration, /private\.is_staff\(\)/);
  assert.match(migration, /private\.is_staff\(array\['admin'\]::public\.staff_role\[\]\)/);
  assert.match(migration, /support_atomic_update_v1/);
  assert.match(migration, /support_atomic_event_v1/);
  assert.match(migration, /support_atomic_delete_v1/);
});

test("Review API attaches Support lifecycle projection from authenticated role and request data", () => {
  assert.match(reviewApi, /projectSupportLifecycle/);
  assert.match(reviewApi, /lifecycle: projectSupportLifecycle\(\{/);
  assert.match(reviewApi, /status: request\.status/);
  assert.match(reviewApi, /role,/);
  assert.match(reviewApi, /requesterPhone: request\.requester_phone \|\| null/);
  assert.match(reviewApi, /resolutionNote: request\.resolution_note \|\| null/);
});

test("Support UI consumes projected statuses and actions without local authorization or browser confirm inference", () => {
  assert.match(supportUi, /selected\.lifecycle\?\.statusOptions/);
  assert.match(supportUi, /selected\.lifecycle\?\.availableActions/);
  assert.match(supportUi, /runProjectedAction\(action\)/);
  assert.match(supportUi, /data-lifecycle-revision=\{selected\.lifecycle\?\.contractRevision/);
  assert.match(supportUi, /<StandardConfirmDialog/);
  assert.doesNotMatch(supportUi, /window\.confirm/);
  assert.doesNotMatch(supportUi, /canDelete/);
  assert.doesNotMatch(supportUi, /disabled=\{!selected\.requester_phone \|\| !selected\.resolution_note\}/);
  assert.doesNotMatch(supportUi, /<option value="new">/);
  assert.doesNotMatch(controller, /canDelete=\{adminData\.profile\.role === "admin"\}/);
});
