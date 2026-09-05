import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/SearchGovernanceWorkspace.tsx", "utf8");

test("search governance extraction preserves the operator contract", () => {
  assert.match(source, /id="operations-search"/);
  assert.match(source, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(source, /Search Governance V1/);
  assert.match(source, /قاموس البحث وجودة النتائج/);
  assert.match(source, /حفظ كمسودة/);
  assert.match(source, /كلمات تحتاج إلى معالجة/);
  assert.match(source, /data-governed-master="true"/);
  assert.match(source, /data-governed-inspector="true"/);
});

test("search governance remains controlled by the operations orchestrator", () => {
  for (const callback of ["onCreate", "onViewChange", "onQueryChange", "onLetterChange", "onEdit", "onStatusChange", "onDelete"]) {
    assert.match(source, new RegExp(callback));
  }
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("search governance preserves lifecycle actions without inventing new transitions", () => {
  assert.match(source, /"active"/);
  assert.match(source, /"draft"/);
  assert.match(source, /"retired"/);
  assert.match(source, /onStatusChange\(term\.id, "active"\)/);
  assert.match(source, /onStatusChange\(term\.id, "retired"\)/);
  assert.match(source, /onStatusChange\(term\.id, "draft"\)/);
});
