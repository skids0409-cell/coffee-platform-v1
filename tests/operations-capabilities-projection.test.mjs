import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync("lib/operations-capabilities-projection.ts", "utf8");
const route = fs.readFileSync("app/api/admin/review/route.ts", "utf8");
const controller = fs.readFileSync("app/ui/admin/OperationsController.tsx", "utf8");
const archive = fs.readFileSync("app/ui/admin/ArchiveWorkspace.tsx", "utf8");

test("operator capabilities expose one revisioned server contract", () => {
  assert.match(projection, /OPERATIONS_CAPABILITIES_CONTRACT_REVISION\s*=\s*"operations\.capabilities\.v1"/);
  for (const capability of ["canManageTaxonomy", "canRestoreRevision", "canResolveQualityIssue", "canDeleteInactiveCatalog"]) {
    assert.match(projection, new RegExp(capability));
  }
  assert.match(projection, /role === "verifier" \|\| role === "admin"/);
  assert.match(projection, /role === "admin"/);
});

test("Review API attaches operator capabilities from authenticated staff role", () => {
  assert.match(route, /projectOperationsCapabilities/);
  assert.match(route, /operatorCapabilities: projectOperationsCapabilities\(role\)/);
  assert.match(route, /loadQueue\(admin\.token, admin\.profile\.role\)/);
});

test("operations controller consumes server capabilities instead of deriving privileged UI actions from role", () => {
  assert.match(controller, /operatorCapabilities: OperationsCapabilitiesProjection/);
  assert.match(controller, /canManageTaxonomy=\{adminData\.operatorCapabilities\.canManageTaxonomy\}/);
  assert.match(controller, /canRestore=\{adminData\.operatorCapabilities\.canRestoreRevision\}/);
  assert.match(controller, /canDecide=\{adminData\.operatorCapabilities\.canResolveQualityIssue\}/);
  assert.match(controller, /canDelete=\{adminData\.operatorCapabilities\.canDeleteInactiveCatalog\}/);
  assert.doesNotMatch(controller, /canManageTaxonomy=\{adminData\.profile\.role === "admin"\}/);
  assert.doesNotMatch(controller, /canRestore=\{\["verifier", "admin"\]\.includes\(adminData\.profile\.role\)\}/);
  assert.doesNotMatch(controller, /canDecide=\{\["verifier", "admin"\]\.includes\(adminData\.profile\.role\)\}/);
});

test("archive delete visibility consumes projected capability instead of role inference", () => {
  assert.match(archive, /canDelete: boolean/);
  assert.match(archive, /\{canDelete && <button/);
  assert.doesNotMatch(archive, /role === "admin"/);
  assert.doesNotMatch(archive, /role: string/);
});
