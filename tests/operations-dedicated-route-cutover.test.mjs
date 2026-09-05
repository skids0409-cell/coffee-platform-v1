import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/operations/page.tsx", "utf8");
const controller = fs.readFileSync("app/ui/admin/OperationsController.tsx", "utf8");

test("operations has a dedicated static route outside the catch-all platform host", () => {
  assert.match(route, /OperationsController/);
  assert.doesNotMatch(route, /Platform/);
  assert.doesNotMatch(route, /\.\.\/ui\/Platform/);
});

test("operations controller composes all governed workspace modules", () => {
  for (const component of [
    "OperationsWorkspaceShell",
    "OperationsDashboardWorkspace",
    "RecordsWorkspace",
    "ReviewWorkspace",
    "MediaVaultWorkspace",
    "DataCenterWorkspace",
    "CatalogDraftWorkspace",
    "PartnerReviewQueue",
    "SearchGovernanceWorkspace",
    "SupportWorkspace",
    "ArchiveWorkspace",
    "TaxonomyWorkspace",
    "ReviewRecordEditor",
    "QualityIssueEditor",
  ]) assert.match(controller, new RegExp(component));
});

test("controller keeps lifecycle-changing actions on existing server APIs", () => {
  assert.match(controller, /\/api\/admin\/review/);
  assert.match(controller, /\/api\/admin\/login/);
  assert.match(controller, /\/api\/admin\/logout/);
  assert.match(controller, /action: "delete_catalog_record"/);
  assert.match(controller, /action: "process_rights_request"/);
  assert.match(controller, /action: "create_search_term"/);
  assert.match(controller, /action: "set_search_term_status"/);
  assert.match(controller, /credentials: "same-origin"/);
  assert.doesNotMatch(controller, /supabase/i);
  assert.doesNotMatch(controller, /\.from\(/);
});

test("dedicated controller preserves explicit publication and destructive confirmations", () => {
  assert.match(controller, /هذا الإجراء سينشر السجل فوراً/);
  assert.match(controller, /اكتب كلمة حذف للتأكيد/);
  assert.match(controller, /سيؤثر هذا المصطلح فوراً/);
});
