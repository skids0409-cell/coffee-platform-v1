import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const designSystem = await readFile(new URL("../app/ui/admin/governance/GovernedWorkspace.tsx", import.meta.url), "utf8");
const bridge = await readFile(new URL("../app/ui/admin/governance/GovernedOperationsBridge.tsx", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
const operationsRoute = await readFile(new URL("../app/operations/page.tsx", import.meta.url), "utf8");
const platform = await readFile(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");
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

test("Phase 6 compatibility bridges are scoped to the dedicated Operations route", () => {
  assert.doesNotMatch(layout, /GovernedOperationsBridge|PendingAssetReviewBridge/);
  assert.match(operationsRoute, /GovernedOperationsBridge/);
  assert.match(operationsRoute, /PendingAssetReviewBridge/);
  assert.match(bridge, /operations-published/);
  assert.match(bridge, /operations-review/);
  assert.match(bridge, /media-vault-assets/);
  assert.match(bridge, /master-detail-v1/);
});

test("Records and Entities share one governed operational contract", () => {
  assert.match(bridge, /dataset\.entityWorkspace = "true"/);
  assert.match(bridge, /Governed Records & Entities Workspace/);
  assert.match(platform, /id="operations-published"/);
  assert.match(platform, /published-record-list/);
});

test("Review and Media retain their working inspectors and governed actions", () => {
  assert.match(assetReview, /Contextual Inspector/);
  assert.match(assetReview, /Approve & Assign/);
  assert.match(assetReview, /Reject & Quarantine/);
  assert.match(mediaVault, /media-vault-inspector/);
  assert.match(mediaVault, /request_purge/);
  assert.match(mediaVault, /legal_hold/);
});

test("Legacy record editor is projected as the contextual inspector during incremental extraction", () => {
  assert.match(platform, /className="record-editor"/);
  assert.match(bridge, /\.record-editor/);
  assert.match(bridge, /dataset\.governedInspector = "true"/);
});

test("Wave B does not duplicate or bypass backend lifecycle mutation contracts", () => {
  assert.doesNotMatch(designSystem, /fetch\(/);
  assert.doesNotMatch(bridge, /fetch\(/);
  assert.match(mediaVault, /\/api\/admin\/media-vault/);
  assert.match(assetReview, /\/api\/admin\/media-vault\/review/);
  assert.match(platform, /\/api\/admin\/records/);
});
