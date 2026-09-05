import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/QualityIssueEditor.tsx", "utf8");

test("quality issue inspector preserves the governed decision boundary", () => {
  assert.match(source, /process_quality_issue/);
  assert.match(source, /\/api\/admin\/review/);
  assert.match(source, /status !== "open" && resolutionNote\.trim\(\)\.length < 10/);
  assert.match(source, /verifier_required/);
  assert.match(source, /target_not_found/);
  assert.match(source, /data-governed-inspector="true"/);
});

test("quality issue inspector does not bypass server authority", () => {
  assert.doesNotMatch(source, /\.from\(|createClient|supabaseUrl/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});
