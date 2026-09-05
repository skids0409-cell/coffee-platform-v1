import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const operationsRoute = fs.readFileSync(path.join(repoRoot, "app/operations/page.tsx"), "utf8");
const controller = fs.readFileSync(path.join(repoRoot, "app/ui/admin/OperationsController.tsx"), "utf8");
const shell = fs.readFileSync(path.join(repoRoot, "app/ui/admin/OperationsWorkspaceShell.tsx"), "utf8");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test("/operations is a dedicated route and never imports the legacy Platform host", () => {
  assert.match(operationsRoute, /OperationsController/);
  assert.doesNotMatch(operationsRoute, /Platform/);
  assert.doesNotMatch(operationsRoute, /GovernedOperationsBridge|PendingAssetReviewBridge|MediaPreservationBridge/);
});

test("the operations controller owns all active workspaces through the governed shell", () => {
  for (const moduleName of [
    "OperationsDashboardWorkspace",
    "RecordsWorkspace",
    "ReviewWorkspace",
    "MediaVaultWorkspace",
    "DataCenterWorkspace",
    "CatalogDraftWorkspace",
    "PartnerReviewQueue",
    "SearchGovernanceWorkspace",
    "SupportWorkspace",
    "ArchiveWorkspace",
    "TaxonomyWorkspace",
  ]) assert.match(controller, new RegExp(moduleName));
  assert.match(controller, /OperationsWorkspaceShell/);
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
