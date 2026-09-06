import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const controller = read("app/ui/admin/OperationsController.tsx");
const v2 = read("app/ui/admin/data-center-v2/DataCenterV2App.tsx");
const rollback = read("app/ui/admin/data-center-v2/LegacyDataCenterRollback.tsx");
const rollbackPage = read("app/operations/data-center-legacy/page.tsx");

test("Operations routes entry and imports to Data Center V2 by default", () => {
  assert.match(controller, /requestedWorkspace === "entry" \|\| requestedWorkspace === "imports"/);
  assert.match(controller, /window\.location\.replace\(`\/operations\/data-center-v2\?view=/);
  assert.match(controller, /useRouter/);
  assert.match(controller, /router\.push\(`\/operations\/data-center-v2\?view=/);
  assert.match(controller, /onWorkspaceChange=\{openWorkspace\}/);
});

test("legacy Data Center components are absent from the active Operations controller", () => {
  assert.doesNotMatch(controller, /import\s+\{?\s*DataCenterWorkspace/);
  assert.doesNotMatch(controller, /import\s+\{?\s*CatalogDraftWorkspace/);
  assert.doesNotMatch(controller, /<DataCenterWorkspace/);
  assert.doesNotMatch(controller, /<CatalogDraftWorkspace/);
});

test("legacy remains isolated behind one rollback-only route", () => {
  assert.match(rollbackPage, /data-data-center-cutover="legacy-rollback-only"/);
  assert.match(rollbackPage, /data-default-data-center="\/operations\/data-center-v2"/);
  assert.match(rollback, /data-legacy-data-center="rollback-only"/);
  assert.match(rollback, /DataCenterWorkspace/);
  assert.match(rollback, /CatalogDraftWorkspace/);
  assert.match(rollback, /Legacy Freeze/);
});

test("V2 accepts governed deep links without exposing manual identifiers", () => {
  assert.match(v2, /new URLSearchParams\(window\.location\.search\)\.get\("view"\)/);
  assert.match(v2, /allowedViews: View\[\] = \["overview", "intake", "catalog", "batches", "handoffs", "client"\]/);
  assert.doesNotMatch(v2, /name=["'][^"']*(?:uuid|entityId|entity_id|recordId|record_id)[^"']*["']/i);
});
