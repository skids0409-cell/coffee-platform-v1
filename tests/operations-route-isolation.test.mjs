import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const operationsRoute = fs.readFileSync(path.join(repoRoot, "app/operations/page.tsx"), "utf8");
const catchAllRoute = fs.readFileSync(path.join(repoRoot, "app/[...slug]/page.tsx"), "utf8");
const controller = fs.readFileSync(path.join(repoRoot, "app/ui/admin/OperationsController.tsx"), "utf8");
const shell = fs.readFileSync(path.join(repoRoot, "app/ui/admin/OperationsWorkspaceShell.tsx"), "utf8");
const rollback = fs.readFileSync(path.join(repoRoot, "app/ui/admin/data-center-v2/LegacyDataCenterRollback.tsx"), "utf8");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test("/operations defaults to Data Center V2 while explicit governed workspaces stay reachable", () => {
  assert.match(operationsRoute, /redirect\(`\/operations\/data-center-v2\?view=\$\{view\}`\)/);
  assert.match(operationsRoute, /workspace === "entry"/);
  assert.match(operationsRoute, /workspace === "imports"/);
  assert.match(operationsRoute, /OperationsController/);
  assert.doesNotMatch(operationsRoute, /Platform/);
  assert.doesNotMatch(operationsRoute, /GovernedOperationsBridge|PendingAssetReviewBridge|MediaPreservationBridge/);
});

test("the catch-all route explicitly refuses to serve /operations through Platform", () => {
  assert.match(catchAllRoute, /path === "\/operations"/);
  assert.match(catchAllRoute, /redirect\("\/operations"\)/);
  assert.match(catchAllRoute, /Platform/);
});

test("the operations controller owns active workspaces and routes Data Center to V2", () => {
  for (const moduleName of [
    "OperationsDashboardWorkspace",
    "RecordsWorkspace",
    "ReviewWorkspace",
    "MediaVaultWorkspace",
    "PartnerReviewQueue",
    "SearchGovernanceWorkspace",
    "SupportWorkspace",
    "ArchiveWorkspace",
    "TaxonomyWorkspace",
  ]) assert.match(controller, new RegExp(moduleName));
  assert.match(controller, /OperationsWorkspaceShell/);
  assert.match(controller, /\/operations\/data-center-v2\?view=/);
  assert.doesNotMatch(controller, /import\s+\{?\s*DataCenterWorkspace/);
  assert.doesNotMatch(controller, /import\s+\{?\s*CatalogDraftWorkspace/);
  assert.match(rollback, /DataCenterWorkspace/);
  assert.match(rollback, /CatalogDraftWorkspace/);
  assert.match(shell, /command-master-inspector-v1/);
});

test("admin operations modules cannot regress to Platform imports or compatibility DOM projection", () => {
  const adminFiles = walk(path.join(repoRoot, "app/ui/admin"));
  for (const file of adminFiles) {
    const source = fs.readFileSync(file, "utf8");
    const relative = path.relative(repoRoot, file);
    assert.doesNotMatch(source, /from\s+["'][^"']*Platform["']/, `${relative} must not import Platform`);
    assert.doesNotMatch(source, /MutationObserver|createPortal/, `${relative} must use direct React composition`);
    assert.doesNotMatch(source, /GovernedOperationsBridge|PendingAssetReviewBridge|MediaPreservationBridge/, `${relative} must not restore bridge-era architecture`);
  }
});
