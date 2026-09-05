import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/DataCenterWorkspace.tsx", "utf8");

test("data center extraction preserves the batch lifecycle actions", () => {
  for (const action of ["create_manual_draft", "stage_csv", "import_batch", "archive_batch"]) {
    assert.match(source, new RegExp(action));
  }
  assert.match(source, /\/api\/admin\/data-center/);
  assert.match(source, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(source, /data-governed-master="true"/);
  assert.match(source, /data-governed-inspector="true"/);
});

test("data center preserves draft-only import safeguards", () => {
  assert.match(source, /سيتم إنشاء السجلات الصالحة كمسودات فقط/);
  assert.match(source, /لا تنشر عملية الاستيراد أي سجل تلقائياً/);
  assert.match(source, /sourceConfirmed/);
  assert.match(source, /status !== "archived"/);
});

test("data center stays behind the existing server boundary", () => {
  assert.match(source, /credentials: "same-origin"/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /\.from\(/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("entry form remains an explicit migration slot until catalog intake is extracted", () => {
  assert.match(source, /renderEntry\?:/);
  assert.match(source, /renderEntry\(reference/);
  assert.match(source, /نموذج الإدخال قيد النقل/);
});
