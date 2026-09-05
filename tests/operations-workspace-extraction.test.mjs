import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const records = fs.readFileSync("app/ui/admin/RecordsWorkspace.tsx", "utf8");
const review = fs.readFileSync("app/ui/admin/ReviewWorkspace.tsx", "utf8");
const operationsRoute = fs.readFileSync("app/operations/page.tsx", "utf8");
const controller = fs.readFileSync("app/ui/admin/OperationsController.tsx", "utf8");

test("Records presentation is available as an independent governed workspace", () => {
  assert.match(records, /export function RecordsWorkspace/);
  assert.match(records, /id="operations-published"/);
  assert.match(records, /data-workspace-contract="master-detail-v1"/);
  assert.match(records, /published-record-list/);
  assert.match(records, /data-governed-master="true"/);
  assert.match(records, /onOpen\(\{ entity: item\.entity, id: item\.id \}\)/);
});

test("Records extraction preserves the current filter vocabulary", () => {
  for (const label of ["كل الأقسام", "قهوة محمصة", "معدات", "مستهلكات", "عناية وصيانة", "قطع غيار", "الدليل والجهات", "العلامات التجارية", "العروض والأسعار", "مصادر القهوة", "التعلم والمعرفة"]) {
    assert.match(records, new RegExp(label));
  }
  assert.match(records, /visibleItems\.slice\(0, 200\)/);
});

test("Review presentation is available as an independent governed workspace", () => {
  assert.match(review, /export function ReviewWorkspace/);
  assert.match(review, /id="operations-review"/);
  assert.match(review, /data-workspace-contract="master-detail-v1"/);
  assert.match(review, /data-governed-master="true"/);
  for (const label of ["المنتجات", "العلامات التجارية", "الجهات", "العروض", "المحتوى", "مصادر القهوة", "ملاحظات الاختبار", "طلبات الحقوق"]) {
    assert.match(review, new RegExp(label));
  }
});

test("Review extraction preserves governed decision boundaries", () => {
  assert.match(review, /\["verifier", "admin"\]\.includes\(role\)/);
  assert.match(review, /onSetStatus\(entityFor\(key\), row\.id, "published"\)/);
  assert.match(review, /onProcessRights\(row\.id, "approved"\)/);
  assert.match(review, /onDeleteRecord\(entityFor\(key\), row\.id, row\.label\)/);
  assert.match(review, /reason\.trim\(\)\.length >= 10/);
});

test("Extracted workspaces remain presentation-only", () => {
  assert.doesNotMatch(records, /fetch\(/);
  assert.doesNotMatch(review, /fetch\(/);
  assert.doesNotMatch(records, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
  assert.doesNotMatch(review, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
});

test("dedicated operations route owns the extracted runtime contract", () => {
  assert.match(operationsRoute, /OperationsController/);
  assert.doesNotMatch(operationsRoute, /Platform/);
  assert.match(controller, /RecordsWorkspace/);
  assert.match(controller, /ReviewWorkspace/);
});
