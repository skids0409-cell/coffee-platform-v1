import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../app/ui/admin/MediaVaultWorkspace.tsx", import.meta.url), "utf8");
const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/admin/media-vault/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/039_phase4_independent_media_vault.sql", import.meta.url), "utf8");
const backfill = readFileSync(new URL("../supabase/migrations/038_phase3_legacy_entity_media_backfill.sql", import.meta.url), "utf8");

test("Phase 4 activates an independent asset-centric Media Vault", () => {
  assert.match(platform, /workspace === "media" && <MediaVaultWorkspace/);
  assert.match(ui, /Media Vault — خزنة الأصول/);
  assert.match(ui, /media-vault-assets/);
  assert.match(ui, /media-vault-inspector/);
  assert.match(ui, /الكيانات المرتبطة/);
  assert.match(ui, /تدقيق الحقوق والمصدر/);
  assert.match(ui, /سجل التدقيق/);
  assert.doesNotMatch(ui, /taxonomy|categoryPath|rootCategory|familyCategory/i);
});

test("Vault queues are computed from assets, links, rights and integrity", () => {
  for (const queue of ["quarantine", "orphan", "duplicate", "rights", "validation", "purge"]) {
    assert.match(ui, new RegExp(`\\["${queue}"`));
  }
  assert.match(api, /activeLinks/);
  assert.match(api, /missingRights/);
  assert.match(api, /technicalReview/);
  assert.match(api, /preview_url/);
  assert.doesNotMatch(api, /categories\?/);
});

test("bulk actions are atomic, role checked and append-only audited", () => {
  assert.match(api, /admin_media_vault_action/);
  assert.match(api, /sameOrigin/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /private\.is_staff/);
  assert.match(migration, /v_role not in \('verifier','admin'\)/);
  assert.match(migration, /v_role <> 'admin'/);
  assert.match(migration, /insert into public\.media_ingestion_events/);
  assert.match(migration, /phase4_.*p_action/);
});

test("unlink and purge remain separate and search results cannot delete files", () => {
  assert.match(migration, /p_action='unlink'/);
  assert.match(migration, /p_action='request_purge'/);
  assert.match(migration, /interval '30 days'/);
  assert.match(migration, /legal_hold_blocks_purge/);
  assert.match(migration, /active_links_block_purge/);
  assert.doesNotMatch(api, /export async function DELETE/);
  assert.doesNotMatch(api, /storageRequest.*DELETE|method:\s*"DELETE"/s);
  assert.match(ui, /لا يوجد حذف دائم مباشر/);
});

test("Migration 038 remains in source and preserves legacy media", () => {
  assert.match(backfill, /legacy_source_and_storage_object_untouched/);
  assert.match(backfill, /insert into public\.media_assets/i);
  assert.match(backfill, /insert into public\.media_asset_links/i);
  assert.doesNotMatch(backfill, /delete\s+from\s+public\.entity_media/i);
});
