import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const recordsRoute = await readFile(new URL("../app/api/admin/records/route.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/048_wave_a_backend_transition_boundary.sql", import.meta.url), "utf8");

test("Phase 2 routes governed record edits through RPC boundaries", () => {
  assert.match(recordsRoute, /rpc\/admin_update_governed_record/);
  assert.match(recordsRoute, /rpc\/admin_update_product_v2/);
  assert.match(recordsRoute, /rpc\/admin_restore_governed_record_revision/);
});

test("records route has no direct writes to governed entity tables", () => {
  for (const table of ["organizations", "brands", "offers", "contents", "origin_claims", "data_quality_issues", "audit_events"]) {
    assert.doesNotMatch(recordsRoute, new RegExp(`adminRest\\(.*${table}.*method:\\s*\\\"PATCH\\\"`, "s"));
  }
  assert.doesNotMatch(recordsRoute, /edit_record_before_publication/);
});

test("Phase 2 RPCs are SECURITY INVOKER and authorization-gated", () => {
  assert.match(migration, /admin_update_governed_record/);
  assert.match(migration, /admin_restore_governed_record_revision/);
  assert.match(migration, /security invoker/gi);
  assert.match(migration, /private\.is_staff\(\)/);
  assert.match(migration, /private\.is_staff\(array\['verifier','admin'\]::public\.staff_role\[\]\)/);
});

test("Phase 2 centralizes audit and quality issue resolution", () => {
  assert.match(migration, /governed_record_update/);
  assert.match(migration, /governance_transition_boundary_v1/);
  assert.match(migration, /update public\.data_quality_issues/);
  assert.match(migration, /restore_record_revision/);
});

test("Phase 2 governed entity branches do not mutate lifecycle state", () => {
  for (const table of ["organizations", "brands", "offers", "contents", "origin_claims"]) {
    assert.doesNotMatch(migration, new RegExp(`update public\\.${table}[\\s\\S]{0,900}set\\s+status\\s*=`, "i"));
  }
  assert.doesNotMatch(migration, /publication_status\s*=/i);
});
