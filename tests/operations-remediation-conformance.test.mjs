import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const contract = read("../lib/operations-remediation-conformance.ts");
const resolverContract = read("../lib/entity-linking-contract.ts");
const resolverRoute = read("../app/api/admin/entity-resolver/route.ts");
const resolverUi = read("../app/ui/admin/ContextualEntitySelector.tsx");
const pendingUi = read("../app/ui/admin/PendingAssetReviewConsole.tsx");
const pendingRoute = read("../app/api/admin/media-vault/review/route.ts");
const supportUi = read("../app/ui/admin/SupportWorkspace.tsx");
const reviewRoute = read("../app/api/admin/review/route.ts");
const technicalTaskRoute = read("../app/api/admin/technical-tasks/route.ts");
const supportMigration = read("../supabase/migrations/063_support_technical_task_governance.sql");
const supportIndexes = read("../supabase/migrations/064_support_technical_task_fk_indexes.sql");
const searchUi = read("../app/ui/admin/SearchGovernanceWorkspace.tsx");
const operationsController = read("../app/ui/admin/OperationsController.tsx");
const searchMigration = read("../supabase/migrations/061_atomic_search_governance.sql");
const preservationRoute = read("../app/api/admin/preservation/route.ts");
const preservationUi = read("../app/ui/admin/governance/MediaPreservationProjection.tsx");
const archiveUi = read("../app/ui/admin/ArchiveWorkspace.tsx");
const importArchiveUi = read("../app/ui/admin/ArchivedImportBatches.tsx");
const shell = read("../app/ui/admin/OperationsWorkspaceShell.tsx");
const architectureUi = read("../app/ui/admin/governance/OperationsCenterArchitecture.tsx");
const taxonomyUi = read("../app/ui/admin/TaxonomyWorkspace.tsx");
const taxonomyRoute = read("../app/api/admin/taxonomy/route.ts");
const workflow = read("../.github/workflows/coffee-platform.yml");

const expectedRules = [
  "FOUNDATION_RESOLVER_GOVERNED",
  "MEDIA_LINKING_CONTEXTUAL",
  "SUPPORT_CANONICAL_REFERENCES",
  "SEARCH_WEAK_QUERY_INTAKE",
  "PRESERVATION_DOMAIN_COUNTS",
  "TAXONOMY_EDITOR_UNOBSTRUCTED",
  "PERMISSIONS_SESSION_BOUNDARIES",
  "CONFORMANCE_SWEEP_ZERO_TOLERANCE",
];

test("operations.remediation.v1 exposes exactly the eight approved package gates", () => {
  assert.match(contract, /OPERATIONS_REMEDIATION_REVISION\s*=\s*"operations\.remediation\.v1"/);
  for (const code of expectedRules) assert.match(contract, new RegExp(`ruleCode: "${code}"`));
  assert.equal((contract.match(/status:\s*"PASS",/g) || []).length, expectedRules.length);
});

test("Foundation Resolver keeps UUID internal and uses staff-authenticated contextual resolution", () => {
  assert.match(resolverContract, /media-linking\.contract\.v1/);
  assert.match(resolverContract, /support_technical_reference/);
  assert.match(resolverRoute, /requireStaff\(request\)/);
  assert.match(resolverRoute, /projectEntityLinkingContract/);
  assert.match(resolverRoute, /isEntityTypeAllowed/);
  assert.match(resolverRoute, /technical_tasks\?select=/);
  assert.match(resolverUi, /entity-resolver/);
  assert.doesNotMatch(resolverUi, /placeholder=["'][^"']*UUID/i);
});

test("Pending Asset Review is contextual and exposes no manual UUID target field", () => {
  assert.match(pendingUi, /<ContextualEntitySelector context="media_pending_review" role=\{linkRole\}/);
  assert.match(pendingUi, /entity_type: entityTarget\?\.entityType/);
  assert.match(pendingUi, /entity_id: entityTarget\?\.id/);
  assert.doesNotMatch(pendingUi, /name=["']entityId["']/);
  assert.doesNotMatch(pendingUi, /placeholder=["'][^"']*UUID/i);
  assert.match(pendingRoute, /isEntityTypeAllowed|projectEntityLinkingContract/);
});

test("Support uses canonical technical task FK and active staff only", () => {
  assert.match(supportMigration, /create table if not exists public\.technical_tasks/i);
  assert.match(supportMigration, /technical_task_id uuid/i);
  assert.match(supportMigration, /references public\.technical_tasks\(id\)/i);
  assert.match(supportMigration, /admin_update_support_request_v2/i);
  assert.match(supportMigration, /invalid_support_assignee/i);
  assert.match(supportMigration, /closed_technical_task_not_assignable/i);
  assert.match(supportMigration, /audit_events/i);
  assert.match(supportIndexes, /technical_tasks_assigned_to_idx/i);
  assert.match(reviewRoute, /profiles\?select=id,display_name,role&is_active=eq\.true/);
  assert.match(reviewRoute, /rpc\/admin_update_support_request_v2/);
  assert.match(supportUi, /ContextualEntitySelector context="support_technical_reference"/);
  assert.match(supportUi, /technicalTaskId:/);
  assert.doesNotMatch(supportUi, /name=["']technicalReference["']/);
  assert.match(technicalTaskRoute, /sameOrigin\(request\)/);
  assert.match(technicalTaskRoute, /requireStaff\(request\)/);
  assert.match(technicalTaskRoute, /rpc\/admin_create_support_technical_task/);
});

test("Weak search queries have a governed draft intake path", () => {
  assert.match(searchUi, /onPromoteWeakQuery/);
  assert.match(operationsController, /const promoteWeakQuery = async/);
  assert.match(operationsController, /action: "create_search_term"/);
  assert.match(operationsController, /sourceBasis: "observed_query"/);
  assert.match(operationsController, /onPromoteWeakQuery=\{\(gap\) => void promoteWeakQuery\(gap\)\}/);
  assert.match(searchMigration, /admin_create_search_term/i);
  assert.match(searchMigration, /audit_events/i);
});

test("Preservation and archive counters stay in separate authoritative domains", () => {
  assert.match(preservationRoute, /oais_preservation_inventory\?select=/);
  assert.match(preservationRoute, /const aipCount = packages\.filter/);
  assert.match(preservationUi, /preservationSummary\.aipCount/);
  assert.match(archiveUi, /data-archive-domain="catalog-records"/);
  assert.match(archiveUi, /سجل كتالوج/);
  assert.match(archiveUi, /دفعات الاستيراد لها سجل وعداد مستقلان/);
  assert.match(importArchiveUi, /دفعات الجهات المشاركة المؤرشفة/);
  assert.match(importArchiveUi, /\{batches\.length\} دفعة/);
});

test("Taxonomy workspace cannot be obscured by the global Operations navigation", () => {
  assert.match(shell, /data-current-workspace=\{workspace\}/);
  assert.match(architectureUi, /data-current-workspace="taxonomy"/);
  assert.match(architectureUi, /position:static\s*!important/);
  assert.match(architectureUi, /taxonomy-workspace/);
  assert.match(taxonomyUi, /taxonomy-layout/);
});

test("Permissions and session boundaries remain server authoritative", () => {
  assert.match(resolverRoute, /requireStaff\(request\)/);
  assert.match(technicalTaskRoute, /sameOrigin\(request\)/);
  assert.match(technicalTaskRoute, /requireStaff\(request\)/);
  assert.match(reviewRoute, /requireStaff\(request\)/);
  assert.match(preservationRoute, /sameOrigin\(request\)/);
  assert.match(preservationRoute, /requireStaff\(request\)/);
  assert.match(preservationRoute, /\["verifier", "admin"\]\.includes\(admin\.profile\.role\)/);
  assert.match(taxonomyRoute, /requireStaff\(request\)/);
  assert.match(pendingRoute, /requireStaff\(request\)/);
});

test("Conformance Sweep is zero-tolerance and temporary cutover tooling is absent", () => {
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /Reject generated source changes/);
  assert.match(workflow, /Upload auditable Next\.js build artifact/);
  for (const path of [
    "../scripts/apply-operations-resolver-cutover.mjs",
    "../scripts/apply-search-weak-query-intake.mjs",
    "../scripts/apply-support-task-cutover.mjs",
    "../.github/workflows/operations-resolver-cutover.yml",
    "../.github/workflows/search-weak-query-intake.yml",
    "../.github/workflows/support-task-cutover.yml",
  ]) assert.equal(existsSync(new URL(path, import.meta.url)), false, `temporary cutover artifact retained: ${path}`);
});
