import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const designSystem = await readFile(new URL("../app/ui/admin/governance/GovernedWorkspace.tsx", import.meta.url), "utf8");
const preservationBridge = await readFile(new URL("../app/ui/admin/governance/MediaPreservationBridge.tsx", import.meta.url), "utf8");
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

test("Phase 6 compatibility projection is limited to Media Preservation", () => {
  assert.doesNotMatch(layout, /MediaPreservationBridge|PendingAssetReviewBridge/);
  assert.match(operationsRoute, /MediaPreservationBridge/);
  assert.doesNotMatch(operationsRoute, /PendingAssetReviewBridge/);
  assert.match(operationsRoute, /OperationsWorkspaceChrome/);
  assert.match(operationsRoute, /OperationsCenterArchitecture/);
  assert.match(operationsRoute, /OperationsWorkspaceComposition/);
  assert.match(preservationBridge, /media-vault-assets/);
  assert.match(preservationBridge, /master-detail-v1/);
  assert.doesNotMatch(preservationBridge, /operations-published|operations-review/);
});

test("Records and Entities use the direct governed workspace contract", () => {
  assert.match(recordsWorkspace, /id="operations-published"/);
  assert.match(recordsWorkspace, /data-workspace-contract="master-detail-v1"/);
  assert.match(recordsWorkspace, /data-governed-master="true"/);
  assert.match(recordsWorkspace, /published-record-list/);
});

test("Review directly owns pending asset audit and Media retains governed actions", () => {
  assert.match(reviewWorkspace, /id="operations-review"/);
  assert.match(reviewWorkspace, /data-workspace-contract="master-detail-v1"/);
  assert.match(reviewWorkspace, /PendingAssetReviewConsole/);
  assert.doesNotMatch(assetReview, /MutationObserver|createPortal/);
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
  assert.doesNotMatch(preservationBridge, /\.record-editor/);
});

test("Wave B does not duplicate or bypass backend lifecycle mutation contracts", () => {
  assert.doesNotMatch(designSystem, /fetch\(/);
  assert.doesNotMatch(preservationBridge, /fetch\(/);
  assert.match(mediaVault, /\/api\/admin\/media-vault/);
  assert.match(assetReview, /\/api\/admin\/media-vault\/review/);
});
