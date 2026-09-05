import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const partner = fs.readFileSync("app/ui/admin/PartnerReviewQueue.tsx", "utf8");
const editor = fs.readFileSync("app/ui/admin/SearchTermEditForm.tsx", "utf8");

test("partner review extraction preserves server-authoritative decisions", () => {
  assert.match(partner, /\/api\/admin\/partner-submissions/);
  assert.match(partner, /upsert_membership/);
  for (const state of ["in_review", "needs_changes", "approved", "rejected"]) assert.match(partner, new RegExp(state));
  assert.match(partner, /reviewNote\.trim\(\)\.length < 10/);
  assert.match(partner, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(partner, /data-governed-master="true"/);
  assert.match(partner, /data-governed-inspector="true"/);
  assert.doesNotMatch(partner, /\.from\(|createClient|supabaseUrl/i);
});

test("search term editor preserves the existing review API boundary", () => {
  assert.match(editor, /\/api\/admin\/review/);
  assert.match(editor, /update_search_term/);
  assert.match(editor, /term\.status === "active"/);
  assert.match(editor, /window\.confirm/);
  assert.match(editor, /data-governed-inspector="true"/);
  assert.doesNotMatch(editor, /\.from\(|createClient|supabaseUrl/i);
});
