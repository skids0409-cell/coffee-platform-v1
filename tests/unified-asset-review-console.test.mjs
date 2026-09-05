import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("../app/ui/admin/PendingAssetReviewBridge.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/admin/media-vault/review/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/045_unified_asset_review_console.sql", import.meta.url), "utf8");

test("Review & Approval exposes a dedicated pending asset audit sub-view", () => {
  assert.match(layout, /PendingAssetReviewBridge/);
  assert.match(ui, /operations-review/);
  assert.match(ui, /الأصول بانتظار الاعتماد وتقارير الفحص/);
  assert.match(ui, /Pending Technical Audit/);
});

test("Contextual Inspector keeps uploader, timestamp and decisions on-screen", () => {
  assert.match(ui, /Contextual Inspector/);
  assert.match(ui, /selected\.uploader\?\.display_name/);
  assert.match(ui, /selected\.created_at/);
  assert.match(ui, /Approve & Assign/);
  assert.match(ui, /Reject & Quarantine/);
  assert.match(api, /profiles\?select=id,display_name,role/);
});

test("Pending asset decisions are role checked and append-only audited", () => {
  assert.match(api, /sameOrigin/);
  assert.match(api, /reviewer_required/);
  assert.match(api, /admin_media_review_pending_asset/);
  assert.match(migration, /security invoker/);
  assert.match(migration, /private\.is_staff\(array\['verifier','admin'\]/);
  assert.match(migration, /pending_asset_approved_and_assigned/);
  assert.match(migration, /pending_asset_rejected_and_quarantined/);
  assert.match(migration, /media_ingestion_events/);
});

test("Zero-orphan traceability is enforced at ingestion and backfilled", () => {
  assert.match(migration, /ensure_media_asset_traceability/);
  assert.match(migration, /after insert on public\.media_assets/);
  assert.match(migration, /traceability_backfill/);
  assert.match(ui, /مسار التدقيق:.*100% مكتمل/);
  assert.match(api, /traceability_gap_count/);
});

test("Approval requires technical evidence and a real assignment target", () => {
  assert.match(migration, /technical_evidence_incomplete/);
  assert.match(migration, /duplicate_requires_review/);
  assert.match(migration, /private\.media_target_exists/);
  assert.match(migration, /publication_status=case when publication_status='private' then 'ready_for_review'/);
  assert.match(migration, /link_status='pending'/);
});

test("Rejection enters governed quarantine with a 30-day timer", () => {
  assert.match(migration, /publication_status='quarantined'/);
  assert.match(migration, /retention_expires_at=now\(\)\+interval '30 days'/);
  assert.match(migration, /active_record_links_block_quarantine/);
  assert.match(ui, /مؤقت الاحتفاظ النظامي لمدة 30 يوماً/);
});
