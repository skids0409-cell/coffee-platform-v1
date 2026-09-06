import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/rendered-html.test.mjs";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
`  assert.match(source, /result\\.created\\?\\.id \\|\\| result\\.id/);\n  assert.match(source, /uploadCatalogMedia\\(entityMap\\[pendingEntityType\\], createdId/);`,
`  const draftController = readFileSync(new URL("../app/ui/admin/useCatalogDraftController.ts", import.meta.url), "utf8");\n  assert.match(draftController, /const createdId = String\\(result\\.created\\?\\.id \\|\\| result\\.id \\|\\| ""\\)/);\n  assert.match(draftController, /uploadCatalogMedia\\(mediaEntityMap\\[entityType\\], createdId/);`,
"catalog created-id contract",
);

replaceOnce(
`  const ui = readPlatformAndOperationsSource();\n  assert.match(api, /object\\/upload\\/sign\\/media-quarantine/);`,
`  const ui = readPlatformAndOperationsSource();\n  const mediaClient = readFileSync(new URL("../app/ui/admin/catalog-media-client.ts", import.meta.url), "utf8");\n  assert.match(api, /object\\/upload\\/sign\\/media-quarantine/);`,
"media intake client source",
);
replaceOnce(
`  assert.match(ui, /signedUploadUrl/);\n  assert.doesNotMatch(ui, /createImageBitmap\\(file\\)/);`,
`  assert.match(mediaClient, /signedUploadUrl/);\n  assert.match(mediaClient, /fetch\\(intent\\.signedUploadUrl, \\{ method: "PUT"/);\n  assert.doesNotMatch(ui, /createImageBitmap\\(file\\)/);`,
"media intake signed URL assertion",
);

replaceOnce(
`  assert.match(ui, /قسم السجل<select value=\\{publishedType\\}/);\n  assert.match(ui, /الفئة المتوافقة<select value=\\{publishedGroup\\}/);`,
`  const recordsWorkspace = readFileSync(new URL("../app/ui/admin/RecordsWorkspace.tsx", import.meta.url), "utf8");\n  assert.match(recordsWorkspace, /<select value=\\{publishedType\\}/);\n  assert.match(recordsWorkspace, /<select value=\\{publishedGroup\\}/);`,
"records filter assertions",
);

replaceOnce(
`  assert.match(ui, /تعذر الاتصال بقاعدة البيانات\\. لم تُنشأ المسودة/);`,
`  const draftController = readFileSync(new URL("../app/ui/admin/useCatalogDraftController.ts", import.meta.url), "utf8");\n  assert.match(draftController, /تعذر الاتصال بقاعدة البيانات\\. لم تُنشأ المسودة/);`,
"catalog connection failure assertion",
);

replaceOnce(
`test("catalog originals are quarantined before server-side validation", () => {\n  const ui = readPlatformAndOperationsSource();\n  const migration = readFileSync(new URL("../supabase/migrations/036_phase3_media_vault_ingestion.sql", import.meta.url), "utf8");\n  assert.match(ui, /signedUploadUrl/);\n  assert.match(ui, /\\/api\\/admin\\/media\\/validate/);`,
`test("catalog originals are quarantined before server-side validation", () => {\n  const mediaClient = readFileSync(new URL("../app/ui/admin/catalog-media-client.ts", import.meta.url), "utf8");\n  const migration = readFileSync(new URL("../supabase/migrations/036_phase3_media_vault_ingestion.sql", import.meta.url), "utf8");\n  assert.match(mediaClient, /signedUploadUrl/);\n  assert.match(mediaClient, /\\/api\\/admin\\/media\\/validate/);`,
"quarantine client assertions",
);

replaceOnce(
`  assert.match(platform, /adminData\\.profile\\.role === "admin" && <TaxonomyWorkspace/);`,
`  assert.match(platform, /taxonomy: <TaxonomyWorkspace \\/>/);\n  assert.match(platform, /canManageTaxonomy=\\{adminData\\.profile\\.role === "admin"\\}/);\n  const shell = readFileSync(new URL("../app/ui/admin/OperationsWorkspaceShell.tsx", import.meta.url), "utf8");\n  assert.match(shell, /value !== "taxonomy" \\|\\| canManageTaxonomy/);`,
"taxonomy role boundary",
);

replaceOnce(
`  assert.match(ui, /تم إنشاء المنتج كمسودة/);`,
`  const draftController = readFileSync(new URL("../app/ui/admin/useCatalogDraftController.ts", import.meta.url), "utf8");\n  assert.match(draftController, /تم إنشاء المنتج كمسودة/);\n  assert.match(draftController, /createPendingDraft/);`,
"phase5 product success contract",
);

writeFileSync(path, source);
console.log("Final seven extracted-architecture assertions aligned.");
