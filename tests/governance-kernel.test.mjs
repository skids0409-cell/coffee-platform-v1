import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/046_wave_a_canonical_governance_kernel.sql", "utf8");
const contract = fs.readFileSync("lib/governance-contract.ts", "utf8");
const inventory = fs.readFileSync("docs/architecture/WAVE_A_PHASE0_ARCHITECTURE_INVENTORY.md", "utf8");

test("Phase 0 inventory records transition-boundary debt", () => {
  assert.match(inventory, /Direct REST mutations exist for lifecycle-capable entity records/);
  assert.match(inventory, /Phase 0 result: COMPLETE/);
});

test("canonical lifecycle registry implements EA baseline vocabulary", () => {
  for (const phase of [
    "INGESTED","VALIDATING","REVIEW","ACTIVE","PUBLISHED","RETAINED","QUARANTINE","LEGAL_HOLD","DISPOSITION_REVIEW","DISPOSED",
  ]) {
    assert.match(migration, new RegExp(`'${phase}'`));
    assert.match(contract, new RegExp(`"${phase}"`));
  }
});

test("Phase 1 is additive and keeps legacy states behind mappings", () => {
  assert.match(migration, /create table if not exists public\.lifecycle_state_mappings/i);
  assert.doesNotMatch(migration, /drop column/i);
  assert.doesNotMatch(migration, /alter type .* rename value/i);
});

test("governed object envelope is security-invoker read projection", () => {
  assert.match(migration, /create or replace view public\.governed_object_envelope\s+with \(security_invoker=true\)/i);
  assert.match(migration, /revoke all on public\.governed_object_envelope from public, anon/i);
  assert.match(migration, /grant select on public\.governed_object_envelope to authenticated/i);
});

test("governance registries use RLS and authenticated read-only access", () => {
  for (const table of ["canonical_lifecycle_registry", "governed_object_type_registry", "lifecycle_state_mappings"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`grant select on public\\.${table} to authenticated`, "i"));
  }
});

test("object registry covers DAM Records Intake and core Entities", () => {
  for (const objectType of ["media_asset","source_record","data_import_batch","data_intake_row","product","organization","brand","offer","content","origin_claim"]) {
    assert.match(migration, new RegExp(`'${objectType}'`));
  }
});

test("kernel revision is explicit", () => {
  assert.match(migration, /wave-a\.phase1\.v1/);
  assert.match(contract, /wave-a\.phase1\.v1/);
});
