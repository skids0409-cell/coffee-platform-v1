import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../app/ui/admin/MediaVaultWorkspace.tsx", import.meta.url), "utf8");
const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/admin/media-vault/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/039_phase4_independent_media_vault.sql", import.meta.url), "utf8");
const backfill = readFileSync(new URL("../supabase/migrations/038_phase3_legacy_entity_media_backfill.sql", import.meta.url), "utf8");
const reconciliation = readFileSync(new URL("../supabase/migrations/042_phase4_legacy_media_reconciliation.sql", import.meta.url), "utf8");
const reconciliationApi = readFileSync(new URL("../app/api/admin/media/reconcile-legacy/route.ts", import.meta.url), "utf8");
const lifecycle = readFileSync(new URL("../supabase/migrations/043_closed_loop_media_asset_lifecycle.sql", import.meta.url), "utf8");
const disposalHardening = readFileSync(new URL("../supabase/migrations/044_media_disposal_security_hardening.sql", import.meta.url), "utf8");
const purgeApi = readFileSync(new URL("../app/api/admin/media-vault/purge/route.ts", import.meta.url), "utf8");
const legacyMediaApi = readFileSync(new URL("../app/api/admin/media/route.ts", import.meta.url), "utf8");

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

test("Vault explains metadata, validation, retention and purge outcomes", () => {
  assert.match(ui, /تعديل الوصف والبيانات/);
  assert.match(ui, /هذه العملية لا تشغّل الفحص التقني/);
  assert.match(ui, /بانتظار الفحص التقني/);
  assert.match(ui, /مدة احتفاظ قدرها 30 يوماً/);
  assert.match(ui, /طلب الإتلاف غير متاح/);
  assert.match(ui, /انتقلت إلى قائمة طلبات الإتلاف/);
  assert.match(ui, /الوصف البديل المحفوظ/);
  assert.match(ui, /purgeStatusLabels/);
});

test("Migration 038 remains in source and preserves legacy media", () => {
  assert.match(backfill, /legacy_source_and_storage_object_untouched/);
  assert.match(backfill, /insert into public\.media_assets/i);
  assert.match(backfill, /insert into public\.media_asset_links/i);
  assert.doesNotMatch(backfill, /delete\s+from\s+public\.entity_media/i);
});

test("legacy reconciliation validates real bytes and never fabricates rights", () => {
  assert.match(reconciliationApi, /validateMedia\(bytes/);
  assert.match(reconciliationApi, /object\/public-media/);
  assert.match(reconciliationApi, /media-derivatives/);
  assert.match(reconciliationApi, /admin_media_complete_legacy_reconciliation/);
  assert.match(reconciliation, /security invoker/g);
  assert.match(reconciliation, /legacy_technical_reconciliation/);
  assert.match(reconciliation, /sha256_hex=v_sha/);
  assert.match(reconciliation, /rights_assertion_created',false/);
  assert.doesNotMatch(reconciliation, /insert into public\.media_rights_assertions/i);
  assert.match(ui, /تدقيق الأصول القديمة/);
  assert.match(ui, /لا يخترع إثبات حقوق/);
});

test("Migration 043 defines one time-aware lifecycle projection",()=>{
  assert.match(lifecycle,/media_asset_lifecycle with \(security_invoker=true\)/);
  for(const state of ["pending_technical_audit","active","quarantine_retention","legal_hold","disposal_eligible","disposal_requested","disposal_approved"]){
    assert.match(lifecycle,new RegExp(`'${state}'`));
  }
  assert.match(lifecycle,/retention_expires_at>now\(\)/);
  assert.match(lifecycle,/interval '30 days'/);
  assert.match(ui,/دورة حياة الأصل المغلقة/);
  assert.match(ui,/الفلاتر أدناه تقرأ الحالة الرسمية نفسها/);
});

test("active records and unsafe assets cannot cross lifecycle boundaries",()=>{
  assert.match(lifecycle,/active_record_links_block_quarantine/);
  assert.match(lifecycle,/asset_not_active_or_target_not_published/);
  assert.match(lifecycle,/media_entity_is_public/);
  assert.match(lifecycle,/technical_status='passed'/);
  assert.match(lifecycle,/review_status='accepted'/);
  assert.match(lifecycle,/link_status='active'/);
  assert.match(lifecycle,/delete from public\.entity_media where asset_id=v_asset/);
});

test("permanent deletion is two-phase, approved and audit-preserving",()=>{
  assert.match(lifecycle,/admin_media_prepare_purge/);
  assert.match(lifecycle,/status='executing'/);
  assert.match(lifecycle,/admin_media_finalize_purge/);
  assert.match(lifecycle,/media_asset_disposal_audit/);
  assert.match(lifecycle,/permanent_media_asset_purge/);
  assert.match(purgeApi,/admin_media_prepare_purge/);
  assert.match(purgeApi,/admin_media_finalize_purge/);
  assert.match(purgeApi,/method:"DELETE"/);
  assert.match(ui,/تنفيذ الإتلاف النهائي/);
  assert.match(disposalHardening,/admin_media_finalize_purge[\s\S]*security invoker/);
  assert.match(disposalHardening,/private\.finalize_media_purge_trigger/);
  assert.match(disposalHardening,/revoke all on function private\.finalize_media_purge_trigger\(\) from public,anon,authenticated/);
  assert.match(disposalHardening,/media_asset_disposal_audit_disposed_by_idx/);
});

test("legacy record editor can only unlink, never purge storage",()=>{
  assert.match(legacyMediaApi,/p_action:"unlink"/);
  assert.match(legacyMediaApi,/permanentDeletion:false/);
  assert.doesNotMatch(legacyMediaApi,/object\/public-media|storageRequest/);
  assert.match(platform,/فصل الصورة/);
  assert.match(platform,/الإتلاف النهائي يتم فقط من Media Vault/);
});
