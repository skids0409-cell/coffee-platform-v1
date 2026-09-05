import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const designSystem = await readFile(new URL("../app/ui/admin/governance/GovernedWorkspace.tsx", import.meta.url), "utf8");
const bridge = await readFile(new URL("../app/ui/admin/governance/GovernedOperationsBridge.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const operationsRoute = await readFile(new URL("../app/operations/page.tsx", import.meta.url), "utf8");
const recordsWorkspace = await readFile(new URL("../app/ui/admin/RecordsWorkspace.tsx", import.meta.url), "utf8");
const reviewWorkspace = await readFile(new URL("../app/ui/admin/ReviewWorkspace.tsx", import.meta.url), "utf8");
const recordEditor = await readFile(new URL("../app/ui/admin/ReviewRecordEditor.tsx", import.meta.url), "utf8");
const mediaVault = await readFile(new URL("../app/ui/admin/MediaVaultWorkspace.tsx", import.meta.url), "utf8");
const assetReview = await readFile(new URL("../app/ui/admin/PendingAssetReviewBridge.tsx", import.meta.url), "utf8");

test("Phase 5 exposes the shared governed workspace design system", () => {
  for (const contract of [
    "GovernedWorkspaceShell",
    "GovernedWorkspaceHeader",
    "GovernanceStatusSummary",
    "MasterDetailWorkspace",
    "InspectorShell",
    "LifecycleBadge",
    "RelationshipPanel",
    "AuditTimeline",
    "TransitionActionPanel",
    "HoldBanner",
    "RetentionTimer",
    "GovernanceEmptyState",
  ]) assert.match(designSystem, new RegExp(`export function ${contract}`));
  assert.match(designSystem, /master-detail-v1/);
  assert.match(designSystem, /data-governed-master/);
  assert.match(designSystem, /data-governed-detail/);
  assert.match(designSystem, /data-governed-inspector/);
});

test("Phase 6 compatibility projections are scoped to the dedicated Operations route", () => {
  assert.doesNotMatch(layout, /GovernedOperationsBridge|PendingAssetReviewBridge/);
  assert.match(operationsRoute, /GovernedOperationsBridge/);
  assert.match(operationsRoute, /PendingAssetReviewBridge/);
  assert.match(operationsRoute, /OperationsWorkspaceChrome/);
  assert.match(operationsRoute, /OperationsCenterArchitecture/);
  assert.match(operationsRoute, /OperationsWorkspaceComposition/);
  assert.match(bridge, /media-vault-assets/);
  assert.match(bridge, /master-detail-v1/);
  assert.doesNotMatch(bridge, /operations-published|operations-review/);
});

test("Records and Entities use the direct governed workspace contract", () => {
  assert.match(recordsWorkspace, /id="operations-published"/);
  assert.match(recordsWorkspace, /data-workspace-contract="master-detail-v1"/);
  assert.match(recordsWorkspace, /data-governed-master="true"/);
  assert.match(recordsWorkspace, /published-record-list/);
});

test("Review and Media retain their working inspectors and governed actions", () => {
  assert.match(reviewWorkspace, /id="operations-review"/);
  assert.match(reviewWorkspace, /data-workspace-contract="master-detail-v1"/);
  assert.match(assetReview, /Contextual Inspector/);
  assert.match(assetReview, /Approve & Assign/);
  assert.match(assetReview, /Reject & Quarantine/);
  assert.match(mediaVault, /media-vault-inspector/);
  assert.match(mediaVault, /request_purge/);
  assert.match(mediaVault, /legal_hold/);
});

test("Record editor is now a direct contextual inspector", () => {
  assert.match(recordEditor, /className="record-editor"/);
  assert.match(recordEditor, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(recordEditor, /data-governed-inspector="true"/);
  assert.doesNotMatch(bridge, /\.record-editor/);
});

test("Wave B does not duplicate or bypass backend lifecycle mutation contracts", () => {
  assert.doesNotMatch(designSystem, /fetch\(/);
  assert.doesNotMatch(bridge, /fetch\(/);
  assert.match(mediaVault, /\/api\/admin\/media-vault/);
  assert.match(assetReview, /\/api\/admin\/media-vault\/review/);
});
