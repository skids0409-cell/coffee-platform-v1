import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const app = read("app/ui/admin/data-center-v2/DataCenterV2App.tsx");
const catalog = read("app/ui/admin/data-center-v2/CatalogIntakeV2.tsx");
const page = read("app/operations/data-center-v2/page.tsx");
const contract = read("lib/data-center-v2-conformance.ts");
const lifecycle = read("lib/data-import-lifecycle-projection.ts");
const dataCenterApi = read("app/api/admin/data-center/route.ts");
const atomicImport = read("supabase/migrations/060_atomic_data_import_boundaries.sql");
const coreSchema = read("supabase/migrations/001_core_schema.sql");

const requiredRules = [
  "MANUAL_UUID_ENTRY_ZERO",
  "UNSCOPED_ENTITY_PICKERS_ZERO",
  "CLIENT_INFERRED_AUTHORITY_ZERO",
  "CLIENT_INFERRED_RELATIONSHIPS_ZERO",
  "FREEFORM_CANONICAL_REFERENCES_ZERO",
  "COUNTER_SOURCE_DRIFT_ZERO",
  "DIRECT_DB_WRITES_ZERO",
  "UNAUDITED_MUTATIONS_ZERO",
  "ORPHAN_RELATIONSHIPS_ZERO",
  "WINDOW_PROMPT_CONFIRM_ZERO",
  "LEGACY_DATA_CENTER_IMPORTS_ZERO",
  "STRUCTURED_CATALOG_INTAKE_PARITY",
  "CLIENT_FACING_PARITY_READ_ONLY",
];

test("data-center.v2.conformance.v1 declares the full zero-tolerance gate", () => {
  assert.match(contract, /data-center\.v2\.conformance\.v1/);
  for (const rule of requiredRules) assert.match(contract, new RegExp(rule));
  assert.equal((contract.match(/ruleCode:\s*["']/g) || []).length, requiredRules.length);
});

test("Data Center V2 is an independent route and legacy remains frozen", () => {
  assert.match(page, /DataCenterV2App/);
  assert.match(page, /data-legacy-freeze="true"/);
  for (const source of [page, app, catalog]) assert.doesNotMatch(source, /import\s+.*(?:DataCenterWorkspace|CatalogDraftWorkspace)/);
});

test("V2 exposes no manual UUID or free-form canonical record identifier", () => {
  assert.match(page, /data-manual-uuid="false"/);
  assert.match(app, /data-manual-uuid="false"/);
  for (const source of [app, catalog]) {
    assert.doesNotMatch(source, /name=["'][^"']*(?:uuid|entityId|entity_id|recordId|record_id)[^"']*["']/i);
    assert.doesNotMatch(source, /placeholder=["'][^"']*UUID/i);
    assert.doesNotMatch(source, /<textarea[^>]+(?:entity|record).*(?:id|uuid)/i);
  }
});

test("batch actions are projected by data-import.lifecycle.v1", () => {
  assert.match(lifecycle, /data-import\.lifecycle\.v1/);
  assert.match(app, /batch\.lifecycle\?\.availableActions/);
  assert.match(app, /action\.apiAction/);
  assert.doesNotMatch(app, /role\s*===\s*["']admin["']/);
  assert.doesNotMatch(app, /batch\.status\s*===\s*["']ready["'][\s\S]{0,180}<button/);
  assert.doesNotMatch(app, /batch\.status\s*===\s*["'](?:imported|rejected|archived)["'][\s\S]{0,180}<button/);
});

test("structured catalog intake preserves master/vendor separation", () => {
  for (const type of ["product", "offer", "organization", "brand", "content", "origin"]) assert.match(catalog, new RegExp(`\\[?\\"${type}\\"|entityType:\\s*\\"${type}\\"|stage\\(event, \\"${type}\\"\\)`));
  assert.match(catalog, /RecordForm/);
  assert.match(catalog, /name="product_id"/);
  assert.match(catalog, /name="seller_organization_id"/);
  const productBlock = catalog.slice(catalog.indexOf('entityType === "product"'), catalog.indexOf('entityType === "offer"'));
  assert.doesNotMatch(productBlock, /name="price"|name="seller_organization_id"/);
  const offerBlock = catalog.slice(catalog.indexOf('entityType === "offer"'), catalog.indexOf('entityType === "organization"'));
  assert.doesNotMatch(offerBlock, /name="description_ar"|name="model_number"|RecordForm/);
});

test("catalog intake uses server records for relationships and preview-before-create", () => {
  assert.match(catalog, /reference\.products\.map/);
  assert.match(catalog, /reference\.organizations\.map/);
  assert.match(catalog, /reference\.countries\.map/);
  assert.match(catalog, /setPending\(/);
  assert.match(catalog, /StandardConfirmDialog/);
  assert.match(catalog, /action:\s*"create_catalog_draft"/);
  assert.doesNotMatch(catalog, /window\.(?:confirm|prompt|alert)\s*\(/);
});

test("V2 does not create direct database or relationship bypasses", () => {
  for (const source of [app, catalog]) {
    assert.doesNotMatch(source, /createClient|supabase|\.from\(|rpc\//i);
    assert.doesNotMatch(source, /entity_media|entity_source_links|governed_relationships/);
  }
  assert.match(app, /fetch\("\/api\/admin\/data-center"/);
  assert.match(catalog, /fetch\("\/api\/admin\/data-center"/);
});

test("V2 mutations stay behind existing audited RPC boundaries", () => {
  assert.match(dataCenterApi, /admin_create_product_draft_v2/);
  assert.match(dataCenterApi, /admin_create_brand_draft/);
  assert.match(dataCenterApi, /admin_create_catalog_draft/);
  assert.match(dataCenterApi, /admin_stage_organization_intake_batch/);
  assert.match(dataCenterApi, /admin_transition_data_import_batch/);
  assert.match(atomicImport, /audit_events/);
  assert.match(atomicImport, /for update/i);
});

test("V2 relationship targets remain FK-backed", () => {
  assert.match(coreSchema, /product_id\s+uuid\s+not null\s+references\s+public\.products/i);
  assert.match(coreSchema, /seller_organization_id\s+uuid\s+not null\s+references\s+public\.organizations/i);
  assert.match(coreSchema, /brand_id\s+uuid\s+references\s+public\.brands/i);
});

test("V2 uses governed confirmation and no browser dialogs", () => {
  assert.match(app, /StandardConfirmDialog/);
  assert.match(catalog, /StandardConfirmDialog/);
  for (const source of [app, catalog]) assert.doesNotMatch(source, /window\.(?:confirm|prompt|alert)\s*\(/);
});

test("batch metrics derive from one batches payload and public counts are isolated", () => {
  assert.match(app, /const stats = useMemo\(\(\) => \{/);
  assert.match(app, /const active = batches\.filter/);
  assert.match(app, /data-client-facing-parity="read-only"/);
  assert.match(app, /public-products/);
  assert.match(app, /public-directory/);
  assert.match(app, /public-search/);
});

test("client-facing parity probes cannot mutate public endpoints", () => {
  const publicFetchBlocks = [...app.matchAll(/fetch\(probe\.endpoint,[\s\S]*?\);/g)].map((match) => match[0]).join("\n");
  assert.ok(publicFetchBlocks.length > 0);
  assert.doesNotMatch(publicFetchBlocks, /method\s*:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
  assert.match(app, /أي إدخال من V2 يبقى Draft حتى يمر عبر Review/);
});
