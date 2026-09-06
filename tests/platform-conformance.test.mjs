import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const readRepo = (path) => readFileSync(join(root, path), "utf8");

function sourceFiles(dir) {
  const absolute = join(root, dir);
  return readdirSync(absolute).flatMap((name) => {
    const path = join(absolute, name);
    if (statSync(path).isDirectory()) return sourceFiles(relative(root, path));
    return /\.(?:ts|tsx|js|jsx|mjs)$/.test(name) ? [path] : [];
  });
}

const platform = read("../lib/platform-conformance.ts");
const conformanceRoute = read("../app/api/admin/architecture-conformance/route.ts");
const platformShell = read("../app/ui/Platform.tsx");
const partnerPortal = read("../app/ui/partner/PartnerPortal.tsx");
const reviewRoute = read("../app/api/admin/review/route.ts");
const partnerRoute = read("../app/api/admin/partner-submissions/route.ts");
const dataCenterRoute = read("../app/api/admin/data-center/route.ts");
const taxonomyRoute = read("../app/api/admin/taxonomy/route.ts");
const pendingAssetReviewRoute = read("../app/api/admin/media-vault/review/route.ts");
const mediaVaultRoute = read("../app/api/admin/media-vault/route.ts");
const mediaPurgeRoute = read("../app/api/admin/media-vault/purge/route.ts");
const preservationRoute = read("../app/api/admin/preservation/route.ts");
const workQueueRoute = read("../app/api/admin/work-queue/route.ts");
const taxonomyUi = read("../app/ui/admin/TaxonomyWorkspace.tsx");
const pendingAssetReviewUi = read("../app/ui/admin/PendingAssetReviewConsole.tsx");
const mediaVaultUi = read("../app/ui/admin/MediaVaultWorkspace.tsx");
const preservationUi = read("../app/ui/admin/governance/MediaPreservationProjection.tsx");
const recordEditorUi = read("../app/ui/admin/ReviewRecordEditor.tsx");
const mediaMigration = read("../supabase/migrations/043_closed_loop_media_asset_lifecycle.sql");
const orphanMigration = read("../supabase/migrations/049_wave_a_zero_orphan_relationship_registry.sql");
const reviewMigration = read("../supabase/migrations/056_phase1_atomic_review_transition.sql");
const rightsMigration = read("../supabase/migrations/057_atomic_rights_request_transition.sql");
const supportMigration = read("../supabase/migrations/058_atomic_support_request_boundaries.sql");
const partnerMigration = read("../supabase/migrations/059_atomic_partner_submission_transition.sql");
const importMigration = read("../supabase/migrations/060_atomic_data_import_boundaries.sql");
const searchMigration = read("../supabase/migrations/061_atomic_search_governance.sql");

const requiredRuleCodes = [
  "LEGACY_OPERATIONS_CODE_ZERO",
  "WINDOW_BROWSER_DIALOGS_ZERO",
  "CLIENT_INFERRED_ACTIONS_ZERO",
  "DIRECT_LIFECYCLE_REST_WRITES_ZERO",
  "UNAUDITED_TRANSITIONS_ZERO",
  "ORPHAN_RELATIONSHIPS_ZERO",
  "REVIEW_ATOMIC_BOUNDARY",
  "RIGHTS_ATOMIC_BOUNDARY",
  "SUPPORT_ATOMIC_BOUNDARY",
  "PARTNER_ATOMIC_BOUNDARY",
  "DATA_IMPORT_ATOMIC_BOUNDARY",
  "SEARCH_ATOMIC_BOUNDARY",
  "TAXONOMY_ATOMIC_BOUNDARY",
  "MEDIA_VAULT_ATOMIC_BOUNDARY",
  "OPERATIONAL_INBOX_READ_ONLY",
  "PARTNER_REGRESSIONS_ZERO",
];

test("platform conformance v2 exposes every final cleanliness gate", () => {
  assert.match(platform, /PLATFORM_CONFORMANCE_REVISION\s*=\s*"phase6\.platform\.v2"/);
  for (const code of requiredRuleCodes) assert.match(platform, new RegExp(`ruleCode: "${code}"`));
  assert.equal((platform.match(/status:\s*"PASS",/g) || []).length, requiredRuleCodes.length);
});

test("architecture endpoint publishes the CI-gated platform result", () => {
  assert.match(conformanceRoute, /kernel:\s*\{/);
  assert.match(conformanceRoute, /platform:\s*\{/);
  assert.match(conformanceRoute, /attestation:\s*"CI_GATED_STATIC_SOURCE"/);
  assert.match(conformanceRoute, /kernelStatus === "CONFORMANT" && platformStatus === "CONFORMANT"/);
  assert.match(conformanceRoute, /PLATFORM_CONFORMANCE_REVISION/);
});

test("WINDOW_PROMPT_CONFIRM=0 across governed UI", () => {
  const files = [...sourceFiles("app/ui/admin"), ...sourceFiles("app/ui/partner")];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /window\.(?:prompt|confirm|alert)\s*\(/, `browser dialog found in ${relative(root, file)}`);
  }
  for (const source of [mediaVaultUi, taxonomyUi, recordEditorUi]) assert.match(source, /StandardConfirmDialog/);
});

test("CLIENT_INFERRED_ACTIONS=0 for privileged Operations surfaces", () => {
  const files = sourceFiles("app/ui/admin");
  const rawRolePredicate = /(?:\brole|profile\.role|data\.role|adminData\.profile\.role)\s*(?:===|!==)\s*["'](?:admin|verifier|editor)["']/;
  const roleIncludesPredicate = /\[(?:[^\]]*["'](?:admin|verifier|editor)["'][^\]]*)\]\.includes\([^)]*role[^)]*\)/;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, rawRolePredicate, `raw role action predicate found in ${relative(root, file)}`);
    assert.doesNotMatch(source, roleIncludesPredicate, `role-derived action predicate found in ${relative(root, file)}`);
  }
  for (const contract of [
    "review-lifecycle-projection",
    "rights-lifecycle-projection",
    "support-lifecycle-projection",
    "partner-lifecycle-projection",
    "data-import-lifecycle-projection",
    "search-term-lifecycle-projection",
    "media-vault-lifecycle-projection",
    "taxonomy-lifecycle-projection",
    "operations-capabilities-projection",
    "preservation-capabilities-projection",
    "pending-asset-review-capabilities",
  ]) assert.ok(sourceFiles("lib").some((file) => file.endsWith(`${contract}.ts`)), `missing ${contract}`);
  assert.match(mediaVaultUi, /asset\.lifecycle\.availableActions/);
  assert.match(taxonomyUi, /lifecycle\.availableActions/);
  assert.match(pendingAssetReviewUi, /capabilities\.canDecide/);
  assert.match(preservationUi, /data\.capabilities/);
});

test("DIRECT_LIFECYCLE_REST_WRITES=0 across governed lifecycle routes", () => {
  assert.match(reviewRoute, /rpc\/admin_transition_review_record/);
  assert.match(reviewRoute, /rpc\/admin_transition_rights_request/);
  assert.match(reviewRoute, /rpc\/admin_update_support_request/);
  assert.match(reviewRoute, /rpc\/admin_set_search_term_status/);
  assert.match(partnerRoute, /rpc\/admin_transition_partner_submission/);
  assert.match(dataCenterRoute, /rpc\/admin_transition_data_import_batch/);
  assert.match(taxonomyRoute, /rpc\/admin_transition_taxonomy_status/);
  assert.match(mediaVaultRoute, /mediaRpc<[^>]+>\(admin\.token,\s*"admin_media_vault_action"/s);
  assert.match(pendingAssetReviewRoute, /mediaRpc<[^>]+>\(admin\.token,\s*"admin_media_review_pending_asset"/s);
  assert.match(mediaPurgeRoute, /admin_media_prepare_purge/);
  assert.match(mediaPurgeRoute, /admin_media_finalize_purge/);
  assert.doesNotMatch(partnerRoute, /partner_submissions\?id=.*method:\s*"PATCH"/s);
  assert.doesNotMatch(dataCenterRoute, /data_import_batches\?id=.*method:\s*"(?:PATCH|DELETE)"/s);
  assert.doesNotMatch(taxonomyRoute, /(?:categories|field_definitions|filter_definitions)\?id=.*method:\s*"PATCH"/s);
  assert.doesNotMatch(mediaVaultRoute, /media_assets\?id=.*method:\s*"(?:PATCH|DELETE)"/s);
});

test("UNAUDITED_TRANSITIONS=0 for governed transition RPCs", () => {
  for (const [name, migration] of [
    ["review", reviewMigration],
    ["rights", rightsMigration],
    ["support", supportMigration],
    ["partner", partnerMigration],
    ["data-import", importMigration],
    ["search", searchMigration],
  ]) {
    assert.match(migration, /for update/i, `${name} transition must lock its state`);
    assert.match(migration, /audit_events/i, `${name} transition must write the canonical audit stream`);
  }
  assert.match(mediaMigration, /for update/i);
  assert.match(mediaMigration, /media_ingestion_events/i);
  assert.match(mediaMigration, /media_asset_disposal_audit/i);
});

test("ORPHAN_RELATIONSHIPS=0 is enforced by canonical constraints and registry", () => {
  assert.match(mediaMigration, /alter table public\.entity_media alter column asset_id set not null/i);
  assert.match(mediaMigration, /foreign key\(asset_id\) references public\.media_assets\(id\) on delete restrict/i);
  assert.match(mediaMigration, /assert_media_link_target/i);
  assert.match(orphanMigration, /governed_relationship/i);
  assert.match(orphanMigration, /zero.orphan|orphan/i);
});

test("Media Vault Taxonomy Pending Review and Preservation consume server action authority", () => {
  assert.match(mediaVaultRoute, /projectMediaVaultLifecycle/);
  assert.match(mediaVaultUi, /projectedSelectionAction/);
  assert.match(taxonomyRoute, /projectTaxonomyLifecycle/);
  assert.match(taxonomyUi, /selectedCategory\.lifecycle\.availableActions/);
  assert.match(taxonomyUi, /selectedField\.lifecycle\.availableActions/);
  assert.match(pendingAssetReviewRoute, /projectPendingAssetReviewCapabilities/);
  assert.match(pendingAssetReviewUi, /capabilities\.canDecide/);
  assert.match(preservationRoute, /projectPreservationCapabilities/);
  assert.match(preservationUi, /capabilities\.canCreateAip/);
  assert.match(preservationUi, /capabilities\.canVerifyFixity/);
  assert.match(preservationUi, /capabilities\.canCreateDip/);
});

test("operational inbox stays read-only and partner regressions stay zero", () => {
  assert.doesNotMatch(workQueueRoute, /export async function (POST|PATCH|DELETE)/);
  assert.match(workQueueRoute, /rights_requests\?select=/);
  assert.match(workQueueRoute, /support_requests\?select=/);
  assert.match(workQueueRoute, /partner_submissions\?select=/);
  assert.doesNotMatch(platformShell, /function Operations\s*\(/);
  assert.match(platformShell, /page\.kind === "partner"/);
  assert.match(platformShell, /<PartnerPortal\s*\/>/);
  assert.match(partnerPortal, /export function PartnerPortal/);
  assert.match(partnerRoute, /rpc\/admin_transition_partner_submission/);
});

test("final conformance depends on permanent CI build lint and test gates", () => {
  const workflow = readRepo(".github/workflows/coffee-platform.yml");
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /Reject generated source changes/);
  assert.match(workflow, /Upload auditable Next\.js build artifact/);
});
