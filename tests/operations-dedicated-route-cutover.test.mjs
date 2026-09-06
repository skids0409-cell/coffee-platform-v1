import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/operations/page.tsx", "utf8");
const controller = fs.readFileSync("app/ui/admin/OperationsController.tsx", "utf8");
const v2 = fs.readFileSync("app/ui/admin/data-center-v2/DataCenterV2App.tsx", "utf8");
const rollback = fs.readFileSync("app/ui/admin/data-center-v2/LegacyDataCenterRollback.tsx", "utf8");
const searchProjection = fs.readFileSync("lib/search-term-lifecycle-projection.ts", "utf8");

test("operations root is a server-authoritative Data Center V2 gateway", () => {
  assert.match(route, /import \{ redirect \} from "next\/navigation"/);
  assert.match(route, /if \(!workspace \|\| workspace === "entry" \|\| workspace === "imports"\)/);
  assert.match(route, /redirect\(`\/operations\/data-center-v2\?view=\$\{view\}`\)/);
  assert.match(route, /OperationsController/);
  assert.doesNotMatch(route, /Platform/);
  assert.doesNotMatch(route, /\.\.\/ui\/Platform/);
});

test("operations controller composes governed modules and cuts Data Center over to V2", () => {
  for (const component of [
    "OperationsWorkspaceShell",
    "OperationsDashboardWorkspace",
    "RecordsWorkspace",
    "ReviewWorkspace",
    "MediaVaultWorkspace",
    "PartnerReviewQueue",
    "SearchGovernanceWorkspace",
    "SupportWorkspace",
    "ArchiveWorkspace",
    "TaxonomyWorkspace",
    "ReviewRecordEditor",
    "QualityIssueEditor",
  ]) assert.match(controller, new RegExp(component));
  assert.match(controller, /\/operations\/data-center-v2\?view=/);
  assert.doesNotMatch(controller, /import\s+\{?\s*DataCenterWorkspace/);
  assert.doesNotMatch(controller, /import\s+\{?\s*CatalogDraftWorkspace/);
  assert.match(rollback, /DataCenterWorkspace/);
  assert.match(rollback, /CatalogDraftWorkspace/);
  assert.match(rollback, /rollback-only/);
});

test("V2 primary navigation never drops the operator into the legacy dashboard", () => {
  assert.match(v2, /href="\/operations\/data-center-v2\?view=overview"/);
  assert.doesNotMatch(v2, />مركز العمليات<\/Link>/);
  assert.doesNotMatch(v2, /href="\/operations\?workspace=dashboard">مركز العمليات/);
});

test("controller keeps lifecycle-changing actions on existing server APIs", () => {
  assert.match(controller, /\/api\/admin\/review/);
  assert.match(controller, /\/api\/admin\/login/);
  assert.match(controller, /\/api\/admin\/logout/);
  assert.match(controller, /action: "delete_catalog_record"/);
  assert.match(controller, /action: "process_rights_request"/);
  assert.match(controller, /action: "create_search_term"/);
  assert.match(controller, /action\.apiAction/);
  assert.match(searchProjection, /apiAction: "set_search_term_status"/);
  assert.match(searchProjection, /apiAction: "delete_search_term"/);
  assert.match(controller, /credentials: "same-origin"/);
  assert.doesNotMatch(controller, /@supabase|createClient\(|supabase\.(?:from|rpc|auth|storage)\b/i);
});

test("dedicated controller preserves explicit governed confirmations", () => {
  assert.match(controller, /هذا الإجراء سينشر السجل فوراً/);
  assert.match(controller, /اكتب كلمة حذف للتأكيد/);
  assert.match(controller, /action\.confirmation\.required/);
  assert.match(searchProjection, /سيؤثر هذا المصطلح فوراً/);
  assert.match(controller, /StandardConfirmDialog/);
});
