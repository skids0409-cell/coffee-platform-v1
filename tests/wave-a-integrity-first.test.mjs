import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const phase3 = await readFile(new URL("../supabase/migrations/049_wave_a_zero_orphan_relationship_registry.sql", import.meta.url), "utf8");
const phase4 = await readFile(new URL("../supabase/migrations/050_wave_a_unified_audit_retention.sql", import.meta.url), "utf8");
const hardening = await readFile(new URL("../supabase/migrations/051_wave_a_audit_hold_hardening.sql", import.meta.url), "utf8");

test("Phase 3 registers and enforces polymorphic governed relationships", () => {
  assert.match(phase3, /governed_relationship_registry/);
  assert.match(phase3, /entity_source_links_target_guard/);
  assert.match(phase3, /governed_target_delete_guard/);
  assert.match(phase3, /governed_relationship_target_missing/);
  assert.match(phase3, /governed_relationship_integrity/);
  assert.match(phase3, /security_invoker=true/);
});

test("Phase 3 canonical target validator covers existing source-link target families", () => {
  for (const target of ["organizations", "brands", "products", "offers", "contents", "origin_claims", "locations"]) {
    assert.match(phase3, new RegExp(`p_target_table='${target}'`));
  }
});

test("Phase 4 creates one canonical append-only audit stream", () => {
  assert.match(phase4, /governed_audit_log/);
  assert.match(phase4, /source_relation,source_event_id/);
  assert.match(phase4, /mirror_governed_audit_event/);
  assert.match(phase4, /mirror_governed_media_ingestion_event/);
  assert.match(phase4, /immutable_audit_guard/);
  assert.match(hardening, /immutable_governed_audit_log/);
  assert.match(hardening, /security definer/gi);
  assert.match(hardening, /revoke all on function private\.mirror_/);
});

test("Phase 4 retention does not invent enterprise legal durations", () => {
  assert.match(phase4, /media_quarantine_30d/);
  assert.match(phase4, /'media_asset','fixed',30/);
  assert.match(phase4, /'source_record','policy_required',null/);
  assert.match(phase4, /'organization','policy_required',null/);
  assert.match(phase4, /'product','policy_required',null/);
});

test("Phase 4 legal holds are verifier-admin governed and audited", () => {
  assert.match(phase4, /admin_set_governed_legal_hold/);
  assert.match(hardening, /private\.is_staff\(array\['verifier','admin'\]::public\.staff_role\[\]\)/);
  assert.match(hardening, /governed_legal_hold_audit/);
  assert.match(hardening, /legal_hold_placed/);
  assert.match(hardening, /legal_hold_released/);
  assert.match(phase4, /governed_retention_projection/);
  assert.match(phase4, /disposition_eligible/);
});
