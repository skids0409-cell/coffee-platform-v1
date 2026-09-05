import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("app/ui/admin/useCatalogDraftController.ts", "utf8");

test("catalog draft controller keeps server-authoritative draft creation", () => {
  assert.match(source, /action: "create_catalog_draft"/);
  assert.match(source, /contractRevision/);
  assert.match(source, /sourceConfirmed: true/);
  assert.match(source, /credentials: "same-origin"/);
  assert.match(source, /attributes: Object\.entries/);
});

test("duplicate and stale-contract failures remain explicit", () => {
  for (const reason of ["contract_revision_stale", "category_kind_mismatch", "brand_kind_mismatch", "duplicate_product", "duplicate_brand", "duplicate_offer"]) {
    assert.match(source, new RegExp(reason));
  }
});

test("media handoff happens only after the draft exists", () => {
  const draftIndex = source.indexOf('action: "create_catalog_draft"');
  const mediaIndex = source.indexOf("uploadCatalogMedia(");
  assert.ok(draftIndex >= 0 && mediaIndex > draftIndex);
  assert.match(source, /لا تنشئ منتجاً ثانياً/);
  assert.match(source, /بقيت خاصة ووُضعت في طابور Media Vault/);
});

test("catalog draft controller has no direct database client", () => {
  assert.doesNotMatch(source, /supabase/i);
  assert.doesNotMatch(source, /\.from\(/);
});
