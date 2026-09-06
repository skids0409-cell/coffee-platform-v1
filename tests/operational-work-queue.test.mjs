import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("operational work queue is read-only and source-owned", () => {
  const route = read("../app/api/admin/work-queue/route.ts");
  assert.match(route, /requireStaff\(request\)/);
  assert.match(route, /data_quality_issues\?select=/);
  assert.match(route, /rights_requests\?select=/);
  assert.match(route, /support_requests\?select=/);
  assert.match(route, /partner_submissions\?select=/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.doesNotMatch(route, /export async function PATCH/);
  assert.doesNotMatch(route, /export async function DELETE/);
  assert.doesNotMatch(route, /work_queue.*insert|workflow.*insert/i);
});

test("operational inbox deep-links back to owning workspaces", () => {
  const route = read("../app/api/admin/work-queue/route.ts");
  const ui = read("../app/ui/admin/OperationsInbox.tsx");
  const page = read("../app/operations/inbox/page.tsx");
  const controller = read("../app/ui/admin/OperationsController.tsx");
  const review = read("../app/ui/admin/ReviewWorkspace.tsx");
  const support = read("../app/ui/admin/SupportWorkspace.tsx");
  const partner = read("../app/ui/admin/PartnerReviewQueue.tsx");

  assert.match(route, /workspace=dashboard&quality=/);
  assert.match(route, /workspace=requests&rights=/);
  assert.match(route, /workspace=requests&support=/);
  assert.match(route, /workspace=partners&submission=/);
  assert.match(ui, /فتح في مساحة العمل المالكة/);
  assert.match(ui, /\/api\/admin\/work-queue/);
  assert.match(page, /<OperationsInbox \/>/);

  assert.match(controller, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(controller, /setWorkspace\(requestedWorkspace\)/);
  assert.match(controller, /focusId=\{deepLinkTarget\.rights\}/);
  assert.match(controller, /focusId=\{deepLinkTarget\.support\}/);
  assert.match(controller, /focusId=\{deepLinkTarget\.submission\}/);
  assert.match(controller, /candidate\.id === deepLinkTarget\.quality/);
  assert.match(review, /review-queue-\$\{row\.id\}/);
  assert.match(support, /setSelectedId\(focusId\)/);
  assert.match(partner, /partner-submission-\$\{focusId\}/);
});

test("inbox interaction does not introduce a mutation bypass", () => {
  const inbox = read("../app/ui/admin/OperationsInbox.tsx");
  const route = read("../app/api/admin/work-queue/route.ts");
  assert.doesNotMatch(inbox, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
  assert.doesNotMatch(route, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
  assert.match(inbox, /href=\{item\.deepLink\}/);
});
