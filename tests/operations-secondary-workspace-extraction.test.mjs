import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const dashboard = fs.readFileSync("app/ui/admin/OperationsDashboardWorkspace.tsx", "utf8");
const archive = fs.readFileSync("app/ui/admin/ArchiveWorkspace.tsx", "utf8");

test("command dashboard presentation is extracted without mutation logic", () => {
  assert.match(dashboard, /export function OperationsDashboardWorkspace/);
  assert.match(dashboard, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(dashboard, /quality-desk/);
  assert.match(dashboard, /onOpenIssue\(item\)/);
  assert.match(dashboard, /onOpenRecord\(\{ entity: item\.entity, id: item\.entityId!/);
  assert.doesNotMatch(dashboard, /fetch\(/);
});

test("dashboard keeps current command and quality signals", () => {
  for (const label of ["بانتظار المراجعة", "ملاحظات جودة مفتوحة", "بطاقات بلا صور", "عروض بلا صور خاصة", "مسودة", "فحص النواقص", "مراجعة", "اعتماد ونشر"]) {
    assert.match(dashboard, new RegExp(label));
  }
});

test("archive presentation is extracted with governed restore/delete callbacks", () => {
  assert.match(archive, /export function ArchiveWorkspace/);
  assert.match(archive, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(archive, /data-governed-master="true"/);
  assert.match(archive, /onRestoreDraft\(item\.entity, item\.id\)/);
  assert.match(archive, /role === "admin"/);
  assert.match(archive, /onDelete\(item\.entity, item\.id, item\.label\)/);
  assert.match(archive, /importArchive/);
  assert.doesNotMatch(archive, /fetch\(/);
});
