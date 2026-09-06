import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projection = readFileSync("lib/partner-lifecycle-projection.ts", "utf8");
const api = readFileSync("app/api/admin/partner-submissions/route.ts", "utf8");
const ui = readFileSync("app/ui/admin/PartnerReviewQueue.tsx", "utf8");
const migration = readFileSync("supabase/migrations/059_atomic_partner_submission_transition.sql", "utf8");

test("Partner lifecycle projection exposes a revisioned server contract", () => {
  assert.match(projection, /PARTNER_LIFECYCLE_CONTRACT_REVISION\s*=\s*"partner\.lifecycle\.v1"/);
  for (const field of ["currentState", "availableActions", "blockedReasons", "validationRequirements", "requiredRoles", "retention"]) {
    assert.match(projection, new RegExp(field));
  }
});

test("Partner projection mirrors the atomic review surface and note requirements", () => {
  for (const target of ["in_review", "needs_changes", "approved", "rejected"]) {
    assert.match(projection, new RegExp(`targetStatus: "${target}"`));
  }
  assert.match(projection, /requiredRoles = \["verifier", "admin"\]/);
  assert.match(projection, /ملاحظة مراجعة لا تقل عن 10 أحرف/);
  assert.match(projection, /supportedEntityTypes = new Set\(\["organization_update", "product_offer", "new_product", "location"\]\)/);
  assert.match(projection, /عنوان الموقع العربي مطلوب قبل الاعتماد/);
});

test("Partner decisions stay atomic and own canonical approval side effects", () => {
  assert.match(migration, /create or replace function public\.admin_transition_partner_submission/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /private\.is_staff\(array\['verifier','admin'\]::public\.staff_role\[\]\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /p_next_status in \('needs_changes','rejected'\)/);
  assert.match(migration, /admin_create_catalog_draft/);
  assert.match(migration, /admin_create_product_draft_v2/);
  assert.match(migration, /insert into public\.locations/);
  assert.match(migration, /partner_atomic_transition_v1/);
});

test("Partner API attaches lifecycle projections using server-side role state entity type and payload", () => {
  assert.match(api, /projectPartnerLifecycle/);
  assert.match(api, /lifecycle: projectPartnerLifecycle\(\{/);
  assert.match(api, /status: String\(row\.status \|\| ""\)/);
  assert.match(api, /role,/);
  assert.match(api, /entityType: String\(row\.entity_type \|\| ""\)/);
  assert.match(api, /payload: row\.payload/);
  assert.match(api, /rpc\/admin_transition_partner_submission/);
});

test("Partner UI consumes projected actions and governed dialogs instead of browser prompts or local status buttons", () => {
  assert.match(ui, /row\.lifecycle\?\.availableActions/);
  assert.match(ui, /runProjectedAction\(row, action\)/);
  assert.match(ui, /data-lifecycle-revision=\{row\.lifecycle\?\.contractRevision/);
  assert.match(ui, /<StandardConfirmDialog/);
  assert.doesNotMatch(ui, /window\.prompt/);
  assert.doesNotMatch(ui, /window\.alert/);
  assert.doesNotMatch(ui, /decide\(row\.id, "in_review"\)/);
  assert.doesNotMatch(ui, /decide\(row\.id, "needs_changes"\)/);
  assert.doesNotMatch(ui, /decide\(row\.id, "approved"\)/);
  assert.doesNotMatch(ui, /decide\(row\.id, "rejected"\)/);
});
