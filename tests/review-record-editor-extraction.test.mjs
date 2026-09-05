import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const editor = fs.readFileSync("app/ui/admin/ReviewRecordEditor.tsx", "utf8");
const controller = fs.readFileSync("app/ui/admin/useReviewRecordEditorController.ts", "utf8");

test("record editor extraction retains the governed inspector contract", () => {
  assert.match(editor, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(editor, /data-governed-inspector="true"/);
  assert.match(editor, /<RecordForm mode="edit"/);
  assert.match(editor, /ملاحظات الجودة المانعة/);
  assert.match(editor, /سجل التغييرات والنسخ السابقة/);
  assert.match(editor, /إدخال أصل جديد إلى Media Vault/);
});

test("record editor preserves entity-specific editing without merging product and seller scope", () => {
  assert.match(editor, /بطاقة المنتج الرئيسية/);
  assert.match(editor, /عرض بائع مرتبط بمنتج/);
  assert.match(editor, /البائع وسعره يربطان من «عرض وسعر»/);
  assert.match(editor, /هذه الصور تظهر في صفحة هذا البائع وعرضه فقط/);
});

test("record editor presentation delegates mutations to its controller", () => {
  assert.match(editor, /useReviewRecordEditorController/);
  assert.doesNotMatch(editor, /fetch\(/);
  assert.doesNotMatch(editor, /supabase/i);
  assert.match(controller, /method: "PATCH"/);
  assert.match(controller, /action: "restore_revision"/);
});

test("record editor keeps source, media and revision safeguards visible", () => {
  assert.match(editor, /لا يوجد مصدر مرتبط؛ لن يكون السجل جاهزاً للنشر/);
  assert.match(editor, /الفصل لا يحذف ملف الأصل/);
  assert.match(editor, /الاستعادة تعيد الحقول الأساسية فقط؛ الصور والعلاقات تبقى محفوظة/);
});
