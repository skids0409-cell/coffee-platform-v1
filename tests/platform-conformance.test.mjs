import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const platform = read("../lib/platform-conformance.ts");
const conformanceRoute = read("../app/api/admin/architecture-conformance/route.ts");
const platformShell = read("../app/ui/Platform.tsx");
const partnerPortal = read("../app/ui/partner/PartnerPortal.tsx");
const reviewWorkspace = read("../app/ui/admin/ReviewWorkspace.tsx");
const operationsController = read("../app/ui/admin/OperationsController.tsx");
const reviewRoute = read("../app/api/admin/review/route.ts");
const partnerRoute = read("../app/api/admin/partner-submissions/route.ts");
const dataCenterRoute = read("../app/api/admin/data-center/route.ts");
const taxonomyRoute = read("../app/api/admin/taxonomy/route.ts");
const workQueueRoute = read("../app/api/admin/work-queue/route.ts");

const requiredRuleCodes = [
  "LEGACY_OPERATIONS_CODE_ZERO",
  "REVIEW_BROWSER_CONFIRM_ZERO",
  "REVIEW_ATOMIC_BOUNDARY",
  "RIGHTS_ATOMIC_BOUNDARY",
  "SUPPORT_ATOMIC_BOUNDARY",
  "PARTNER_ATOMIC_BOUNDARY",
  "DATA_IMPORT_ATOMIC_BOUNDARY",
  "SEARCH_ATOMIC_BOUNDARY",
  "TAXONOMY_ATOMIC_BOUNDARY",
  "OPERATIONAL_INBOX_READ_ONLY",
  "PARTNER_ROUTE_ISOLATION",
];

test("platform conformance manifest exposes all CI-gated rules", () => {
  assert.match(platform, /PLATFORM_CONFORMANCE_REVISION\s*=\s*"phase6\.platform\.v1"/);
  for (const code of requiredRuleCodes) assert.match(platform, new RegExp(`ruleCode: "${code}"`));
  assert.equal((platform.match(/status:\s*"PASS"/g) || []).length, requiredRuleCodes.length);
});

test("architecture endpoint separates kernel and platform conformance", () => {
  assert.match(conformanceRoute, /kernel:\s*\{/);
  assert.match(conformanceRoute, /platform:\s*\{/);
  assert.match(conformanceRoute, /attestation:\s*"CI_GATED_STATIC_SOURCE"/);
  assert.match(conformanceRoute, /kernelStatus === "CONFORMANT" && platformStatus === "CONFORMANT"/);
  assert.match(conformanceRoute, /PLATFORM_CONFORMANCE_REVISION/);
});

test("legacy Operations remains removed while partner routing stays isolated", () => {
  assert.doesNotMatch(platformShell, /function Operations\s*\(/);
  assert.doesNotMatch(platformShell, /kind:\s*"operations"/);
  assert.match(platformShell, /page\.kind === "partner"/);
  assert.match(platformShell, /<PartnerPortal\s*\/>/);
  assert.match(partnerPortal, /export function PartnerPortal/);
});

test("Review confirmation and lifecycle boundaries remain governed", () => {
  assert.doesNotMatch(reviewWorkspace, /window\.(?:prompt|confirm)/);
  assert.match(operationsController, /StandardConfirmDialog/);
  assert.match(operationsController, /reviewConfirm/);
  assert.match(reviewRoute, /rpc\/admin_transition_review_record/);
  assert.match(reviewRoute, /rpc\/admin_transition_rights_request/);
  assert.match(reviewRoute, /rpc\/admin_update_support_request/);
  assert.match(reviewRoute, /rpc\/admin_mark_support_event/);
  assert.match(reviewRoute, /rpc\/admin_delete_archived_support_request/);
  assert.match(reviewRoute, /rpc\/admin_create_search_term/);
  assert.match(reviewRoute, /rpc\/admin_update_search_term/);
  assert.match(reviewRoute, /rpc\/admin_set_search_term_status/);
  assert.match(reviewRoute, /rpc\/admin_delete_search_term/);
});

test("Partner and Data Import orchestration stays behind atomic RPC boundaries", () => {
  assert.match(partnerRoute, /rpc\/admin_transition_partner_submission/);
  assert.doesNotMatch(partnerRoute, /partner_submissions\?id=.*method:\s*"PATCH"/s);
  assert.match(dataCenterRoute, /rpc\/admin_stage_organization_intake_batch/);
  assert.match(dataCenterRoute, /rpc\/import_organization_intake_batch/);
  assert.match(dataCenterRoute, /rpc\/admin_transition_data_import_batch/);
  assert.match(dataCenterRoute, /rpc\/admin_delete_archived_data_import_batch/);
  assert.doesNotMatch(dataCenterRoute, /data_import_batches\?id=.*method:\s*"(?:PATCH|DELETE)"/s);
});

test("Taxonomy lifecycle uses its existing atomic transition RPC", () => {
  assert.match(taxonomyRoute, /rpc\/admin_transition_taxonomy_status/);
  assert.doesNotMatch(taxonomyRoute, /categories\?id=.*method:\s*"PATCH"/s);
  assert.doesNotMatch(taxonomyRoute, /field_definitions\?id=.*method:\s*"PATCH"/s);
  assert.doesNotMatch(taxonomyRoute, /filter_definitions\?id=.*method:\s*"PATCH"/s);
});

test("operational inbox remains projection-only", () => {
  assert.doesNotMatch(workQueueRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(workQueueRoute, /rights_requests\?select=/);
  assert.match(workQueueRoute, /support_requests\?select=/);
  assert.match(workQueueRoute, /partner_submissions\?select=/);
});
