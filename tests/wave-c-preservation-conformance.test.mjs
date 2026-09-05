import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const oais = await readFile(new URL("../supabase/migrations/053_wave_c_oais_preservation_capability.sql", import.meta.url), "utf8");
const conformance = await readFile(new URL("../supabase/migrations/054_wave_c_architecture_conformance_gate.sql", import.meta.url), "utf8");
const preservationApi = await readFile(new URL("../app/api/admin/preservation/route.ts", import.meta.url), "utf8");
const conformanceApi = await readFile(new URL("../app/api/admin/architecture-conformance/route.ts", import.meta.url), "utf8");
const governedUi = await readFile(new URL("../app/ui/admin/governance/GovernedWorkspace.tsx", import.meta.url), "utf8");

test("Phase 7 implements OAIS archival and dissemination package contracts", () => {
  assert.match(oais, /ISO 14721:2025/);
  assert.match(oais, /oais_preservation_packages/);
  assert.match(oais, /package_type in \('SIP','AIP','DIP'\)/);
  assert.match(oais, /representation_information/);
  assert.match(oais, /preservation_description_information/);
  assert.match(oais, /content_sha256_hex/);
  assert.match(oais, /designated_community/);
  assert.match(oais, /admin_create_oais_aip/);
  assert.match(oais, /admin_verify_oais_fixity/);
  assert.match(oais, /admin_create_oais_dip/);
});

test("OAIS preservation history is immutable and governance audited", () => {
  assert.match(oais, /immutable_oais_package/);
  assert.match(oais, /immutable_oais_event/);
  assert.match(oais, /immutable_preservation_history/);
  assert.match(oais, /governed_audit_log/);
  assert.match(oais, /oais_aip_created/);
  assert.match(oais, /oais_fixity_checked/);
  assert.match(oais, /oais_dip_created/);
});

test("Preservation APIs preserve role and same-origin transition boundaries", () => {
  assert.match(preservationApi, /requireStaff/);
  assert.match(preservationApi, /sameOrigin/);
  assert.match(preservationApi, /verifier.*admin/);
  assert.match(preservationApi, /admin_create_oais_aip/);
  assert.match(preservationApi, /admin_verify_oais_fixity/);
  assert.match(preservationApi, /admin_create_oais_dip/);
  assert.doesNotMatch(preservationApi, /from\("oais_preservation_packages"\).*insert/s);
});

test("Phase 8 exposes a machine-readable architecture conformance gate", () => {
  assert.match(conformance, /architecture_conformance_rules/);
  assert.match(conformance, /architecture_conformance_report/);
  assert.match(conformance, /architecture_conformance_summary/);
  assert.match(conformance, /wave-c\.phase8\.v1/);
  for (const rule of [
    "LIFECYCLE_MAPPING_COVERAGE",
    "ZERO_ORPHAN_REFERENTIAL_INTEGRITY",
    "RETENTION_POLICY_COVERAGE",
    "AUDIT_IMMUTABILITY",
    "OAIS_AIP_COVERAGE",
    "OAIS_AIP_MANIFEST_COMPLETENESS",
    "OAIS_PRESERVATION_IMMUTABILITY",
    "GOVERNANCE_RLS_COVERAGE",
    "UNIFIED_WORKSPACE_CONTRACT",
  ]) assert.match(conformance, new RegExp(rule));
});

test("Conformance gate keeps Supabase security controls explicit", () => {
  assert.match(oais, /enable row level security/);
  assert.match(conformance, /enable row level security/);
  assert.match(oais, /security invoker/);
  assert.match(conformance, /security invoker/);
  assert.match(oais, /revoke all .* from public, anon/);
  assert.match(conformance, /revoke all .* from public,anon/);
});

test("Operator UI viewpoint remains tied to the shared Wave B workspace contract", () => {
  assert.match(conformance, /ISO\/IEC\/IEEE 42010:2022 Operator\/UI Viewpoint/);
  assert.match(conformance, /UNIFIED_WORKSPACE_CONTRACT/);
  assert.match(governedUi, /master-detail-v1/);
});

test("Architecture conformance API is staff-only and read-only", () => {
  assert.match(conformanceApi, /requireStaff/);
  assert.match(conformanceApi, /architecture_conformance_report/);
  assert.match(conformanceApi, /CONFORMANT/);
  assert.doesNotMatch(conformanceApi, /export async function POST/);
});
