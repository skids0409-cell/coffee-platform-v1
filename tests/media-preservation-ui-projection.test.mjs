import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync("app/ui/admin/governance/MediaPreservationProjection.tsx", "utf8");
const bridge = fs.readFileSync("app/ui/admin/governance/GovernedOperationsBridge.tsx", "utf8");
const preservationApi = fs.readFileSync("app/api/admin/preservation/route.ts", "utf8");
const conformanceApi = fs.readFileSync("app/api/admin/architecture-conformance/route.ts", "utf8");

test("Media Vault visibly projects OAIS preservation and architecture conformance", () => {
  assert.match(projection, /OAIS Preservation · Governance Projection/);
  assert.match(projection, /AIP Coverage/);
  assert.match(projection, /Fixity Failures/);
  assert.match(projection, /Architecture Conformance/);
  assert.match(projection, /wave-c\.phase8\.v1/);
});

test("preservation projection is mounted inside governed Media Vault surfaces", () => {
  assert.match(bridge, /MediaPreservationStatusStrip/);
  assert.match(bridge, /MediaPreservationInspectorPanel/);
  assert.match(bridge, /media-vault-inspector/);
  assert.match(bridge, /preservationStatusHost/);
  assert.match(bridge, /preservationInspectorHost/);
});

test("operator can create AIP, verify independent fixity, and create DIP from the inspector", () => {
  assert.match(projection, /Create AIP · إنشاء حزمة حفظ/);
  assert.match(projection, /Verify Fixity · تحقق البصمة/);
  assert.match(projection, /Create DIP · إنشاء حزمة توزيع/);
  assert.match(projection, /action: "create_aip"/);
  assert.match(projection, /action: "verify_fixity"/);
  assert.match(projection, /action: "create_dip"/);
  assert.match(projection, /64 hex characters from an independent byte-level check/);
  assert.match(projection, /الواجهة لا تفترض أن SHA المخزن هو نتيجة فحص جديد/);
});

test("preservation actions remain backend-authoritative and role governed", () => {
  assert.match(projection, /fetch\("\/api\/admin\/preservation"/);
  assert.match(projection, /\["verifier", "admin"\]/);
  assert.match(preservationApi, /admin_create_oais_aip/);
  assert.match(preservationApi, /admin_verify_oais_fixity/);
  assert.match(preservationApi, /admin_create_oais_dip/);
  assert.match(preservationApi, /sameOrigin\(request\)/);
  assert.match(preservationApi, /verifier_required/);
});

test("output status is sourced from authoritative preservation and conformance APIs", () => {
  assert.match(projection, /\/api\/admin\/media-vault/);
  assert.match(projection, /\/api\/admin\/preservation/);
  assert.match(projection, /\/api\/admin\/architecture-conformance/);
  assert.match(conformanceApi, /architecture_conformance_report/);
  assert.match(conformanceApi, /conformanceStatus/);
});
