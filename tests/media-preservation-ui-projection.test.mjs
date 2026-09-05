import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync("app/ui/admin/governance/MediaPreservationProjection.tsx", "utf8");
const mediaVault = fs.readFileSync("app/ui/admin/MediaVaultWorkspace.tsx", "utf8");
const operationsRoute = fs.readFileSync("app/operations/page.tsx", "utf8");
const shell = fs.readFileSync("app/ui/admin/OperationsWorkspaceShell.tsx", "utf8");
const chrome = fs.readFileSync("app/ui/admin/governance/OperationsWorkspaceChrome.tsx", "utf8");
const preservationApi = fs.readFileSync("app/api/admin/preservation/route.ts", "utf8");
const conformanceApi = fs.readFileSync("app/api/admin/architecture-conformance/route.ts", "utf8");

test("Media Vault visibly projects OAIS preservation and architecture conformance", () => {
  assert.match(projection, /OAIS Preservation · Governance Projection/);
  assert.match(projection, /AIP Coverage/);
  assert.match(projection, /Fixity Failures/);
  assert.match(projection, /Architecture Conformance/);
  assert.match(projection, /wave-c\.phase8\.v1/);
});

test("preservation is directly composed inside governed Media Vault surfaces", () => {
  assert.match(mediaVault, /MediaPreservationStatusStrip/);
  assert.match(mediaVault, /MediaPreservationInspectorPanel/);
  assert.match(mediaVault, /id="operations-media"/);
  assert.match(mediaVault, /data-governed-workspace="media"/);
  assert.match(mediaVault, /data-workspace-contract="master-detail-v1"/);
  assert.match(mediaVault, /data-governed-master="true"/);
  assert.match(mediaVault, /data-governed-inspector="true"/);
  assert.doesNotMatch(operationsRoute, /MediaPreservationBridge/);
  assert.doesNotMatch(mediaVault, /MutationObserver|createPortal/);
});

test("OAIS data loading is decoupled from optional architecture conformance", () => {
  assert.match(projection, /readPreservationProjection/);
  assert.match(projection, /readConformanceProjection/);
  assert.match(projection, /Promise\.allSettled/);
  assert.match(projection, /void readConformanceProjection\(\)\.then\(setConformance\)\.catch/);
  assert.doesNotMatch(projection, /if \(!vaultResponse\.ok \|\| !preservationResponse\.ok \|\| !conformanceResponse\.ok\)/);
  assert.match(projection, /التوافق المعماري يُقرأ بشكل مستقل ولا يعطل بيانات الحفظ/);
  assert.match(projection, /إعادة المحاولة/);
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
  assert.match(projection, /fetch\(url, \{ cache: "no-store", credentials: "same-origin" \}\)/);
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

test("operations shell owns the unified governed workspace chrome", () => {
  assert.match(shell, /OperationsWorkspaceChrome/);
  assert.doesNotMatch(operationsRoute, /OperationsWorkspaceChrome/);
  assert.match(chrome, /\.operations-workspace-nav/);
  assert.match(chrome, /border-radius: 14px/);
  assert.match(chrome, /background: #3a1f12/);
  assert.match(chrome, /top: 86px/);
  assert.match(chrome, /@media \(max-width: 600px\)/);
});
