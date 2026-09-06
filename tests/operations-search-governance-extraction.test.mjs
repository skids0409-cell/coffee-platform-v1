import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/SearchGovernanceWorkspace.tsx", "utf8");
const projection = fs.readFileSync("lib/search-term-lifecycle-projection.ts", "utf8");

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
  for (const callback of ["onCreate", "onViewChange", "onQueryChange", "onLetterChange", "onEdit", "onLifecycleAction"]) {
    assert.match(source, new RegExp(callback));
  }
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("search governance consumes projected lifecycle actions without local transition inference", () => {
  assert.match(source, /term\.lifecycle\.availableActions\.map/);
  assert.match(source, /action\.enabled/);
  assert.match(source, /action\.blockedReason/);
  assert.match(source, /action\.label/);
  assert.match(projection, /SEARCH_TERM_LIFECYCLE_CONTRACT_REVISION\s*=\s*"search-governance\.lifecycle\.v1"/);
  assert.match(projection, /nextStatus: "active"/);
  assert.match(projection, /nextStatus: "retired"/);
  assert.match(projection, /nextStatus: "draft"/);
  assert.doesNotMatch(source, /onStatusChange\(term\.id/);
  assert.doesNotMatch(source, /term\.status\s*!==\s*"active"\s*&&\s*<button/);
  assert.doesNotMatch(source, /term\.status\s*===\s*"active"\s*&&\s*<button/);
});