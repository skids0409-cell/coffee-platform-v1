import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/CatalogDraftWorkspace.tsx", "utf8");

test("catalog draft workspace keeps the governed intake composition", () => {
  assert.match(source, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(source, /data-governed-master="true"/);
  assert.match(source, /data-governed-inspector="true"/);
  assert.match(source, /<RecordForm mode="create"/);
  assert.match(source, /useCatalogDraftController/);
});

test("catalog draft presentation separates product master from seller offer", () => {
  assert.match(source, /بطاقة منتج رئيسية/);
  assert.match(source, /منتج لدى بائع/);
  assert.match(source, /العرض لا ينشئ منتجاً جديداً/);
  assert.match(source, /ليست جهة البيع/);
});

test("catalog draft preserves source media and preview safeguards", () => {
  assert.match(source, /sourceConfirmed/);
  assert.match(source, /mediaAttested/);
  assert.match(source, /SHA-256/);
  assert.match(source, /لم تُحفظ بعد/);
  assert.match(source, /تأكيد وإنشاء المسودة/);
});

test("catalog draft presentation contains no mutation fetch or direct database client", () => {
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /\.from\(/);
});
