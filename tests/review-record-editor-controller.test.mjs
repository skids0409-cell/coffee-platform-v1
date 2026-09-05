import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync("app/ui/admin/useReviewRecordEditorController.ts", "utf8");
const media = fs.readFileSync("app/ui/admin/catalog-media-client.ts", "utf8");

test("record editor controller preserves authoritative record mutations", () => {
  assert.match(controller, /fetch\(`\/api\/admin\/records\?entity=/);
  assert.match(controller, /method: "PATCH"/);
  assert.match(controller, /action: "restore_revision"/);
  assert.match(controller, /contractRevision: editorContract\?\.contract_revision/);
  assert.match(controller, /issueUpdates: issueUpdates\.filter/);
  assert.match(controller, /credentials: "same-origin"/);
});

test("published edits and revision restore retain explicit confirmation", () => {
  assert.match(controller, /هذا السجل منشور حالياً/);
  assert.match(controller, /سيُعاد محتوى الحقول الأساسية إلى النسخة السابقة/);
  assert.match(controller, /العلاقات والصور لا تُحذف/);
});

test("media lifecycle stays intent-upload-validate and never publishes directly", () => {
  assert.match(media, /\/api\/admin\/media/);
  assert.match(media, /signedUploadUrl/);
  assert.match(media, /\/api\/admin\/media\/validate/);
  assert.match(media, /x-upsert/);
  assert.match(media, /SHA-256|storage_rejected|attestation_required/);
  assert.doesNotMatch(media, /supabase/i);
  assert.doesNotMatch(media, /\.from\(/);
});

test("record editor media unlink preserves the Media Vault original", () => {
  assert.match(controller, /لن يُحذف ملف الأصل من Media Vault/);
  assert.match(controller, /method: "DELETE"/);
  assert.match(controller, /بقي الأصل محفوظاً في Media Vault وفق دورة حياته/);
});
