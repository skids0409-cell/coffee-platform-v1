import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const support = fs.readFileSync("app/ui/admin/SupportWorkspace.tsx", "utf8");
const archive = fs.readFileSync("app/ui/admin/ArchivedImportBatches.tsx", "utf8");

test("support desk extraction preserves the governed operational workflow", () => {
  assert.match(support, /id="operations-support"/);
  assert.match(support, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(support, /data-governed-master="true"/);
  assert.match(support, /data-governed-inspector="true"/);
  assert.match(support, /update_support_request/);
  assert.match(support, /mark_support_escalated/);
  assert.match(support, /mark_support_reply/);
  assert.match(support, /delete_support_request/);
  assert.match(support, /resolutionNote/);
});

test("support desk keeps mutation authority on the existing review API", () => {
  assert.match(support, /fetch\("\/api\/admin\/review"/);
  assert.doesNotMatch(support, /supabase/i);
  assert.doesNotMatch(support, /\.from\(/);
});

test("archived import extraction preserves restore and permanent-delete safeguards", () => {
  assert.match(archive, /fetch\("\/api\/admin\/data-center"/);
  assert.match(archive, /restore_batch/);
  assert.match(archive, /delete_archived_batch/);
  assert.match(archive, /confirmation\?\.trim\(\) !== batch\.batch_code/);
  assert.match(archive, /status === "archived"/);
  assert.match(archive, /data-workspace-contract="command-master-inspector-v1"/);
});

test("archived import component does not bypass the server boundary", () => {
  assert.doesNotMatch(archive, /supabase/i);
  assert.doesNotMatch(archive, /\.from\(/);
  assert.doesNotMatch(archive, /localStorage|sessionStorage/);
});
