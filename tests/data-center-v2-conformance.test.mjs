import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const app = read("app/ui/admin/data-center-v2/DataCenterV2App.tsx");
const page = read("app/operations/data-center-v2/page.tsx");
const contract = read("lib/data-center-v2-conformance.ts");
const lifecycle = read("lib/data-import-lifecycle-projection.ts");

const requiredRules = [
  "MANUAL_UUID_ENTRY_ZERO",
  "UNSCOPED_ENTITY_PICKERS_ZERO",
  "CLIENT_INFERRED_AUTHORITY_ZERO",
  "CLIENT_INFERRED_RELATIONSHIPS_ZERO",
  "FREEFORM_CANONICAL_REFERENCES_ZERO",
  "COUNTER_SOURCE_DRIFT_ZERO",
  "DIRECT_DB_WRITES_ZERO",
  "WINDOW_PROMPT_CONFIRM_ZERO",
  "LEGACY_DATA_CENTER_IMPORTS_ZERO",
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
  assert.doesNotMatch(page, /import\s+.*(?:DataCenterWorkspace|CatalogDraftWorkspace)/);
  assert.doesNotMatch(app, /import\s+.*(?:DataCenterWorkspace|CatalogDraftWorkspace)/);
});

test("V2 exposes no manual UUID or generic canonical reference field", () => {
  assert.match(page, /data-manual-uuid="false"/);
  assert.match(app, /data-manual-uuid="false"/);
  assert.doesNotMatch(app, /name=["'][^"']*(?:uuid|entityId|entity_id|recordId|record_id)[^"']*["']/i);
  assert.doesNotMatch(app, /placeholder=["'][^"']*UUID/i);
  assert.doesNotMatch(app, /<textarea[^>]+(?:entity|record).*(?:id|uuid)/i);
});

test("batch actions are projected by data-import.lifecycle.v1", () => {
  assert.match(lifecycle, /data-import\.lifecycle\.v1/);
  assert.match(app, /batch\.lifecycle\?\.availableActions/);
  assert.match(app, /action\.apiAction/);
  assert.doesNotMatch(app, /role\s*===\s*["']admin["']/);
  assert.doesNotMatch(app, /batch\.status\s*===\s*["']ready["'][\s\S]{0,180}<button/);
  assert.doesNotMatch(app, /batch\.status\s*===\s*["'](?:imported|rejected|archived)["'][\s\S]{0,180}<button/);
});

test("V2 does not create direct database or relationship bypasses", () => {
  assert.doesNotMatch(app, /createClient|supabase|\.from\(|rpc\//i);
  assert.doesNotMatch(app, /entity_media|entity_source_links|governed_relationships/);
  assert.match(app, /fetch\("\/api\/admin\/data-center"/);
});

test("V2 uses governed confirmation and no browser dialogs", () => {
  assert.match(app, /StandardConfirmDialog/);
  assert.doesNotMatch(app, /window\.(?:confirm|prompt|alert)\s*\(/);
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
