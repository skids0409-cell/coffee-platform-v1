import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const projection = readFileSync(new URL("../lib/data-import-lifecycle-projection.ts", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../app/ui/admin/DataCenterWorkspace.tsx", import.meta.url), "utf8");
const archive = readFileSync(new URL("../app/ui/admin/ArchivedImportBatches.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/060_atomic_data_import_boundaries.sql", import.meta.url), "utf8");

test("Data Import lifecycle projection exposes one revisioned server contract", () => {
  assert.match(projection, /data-import\.lifecycle\.v1/);
  for (const action of ["import", "archive", "restore", "delete"]) assert.match(projection, new RegExp(`action: "${action}"`));
  assert.match(projection, /deletionRequiresArchivedState: true/);
  assert.match(projection, /deletionRequiresAdmin: true/);
  assert.match(projection, /confirmationMode: "typed"/);
});

test("Data Center API attaches lifecycle projections using authenticated role and batch state", () => {
  assert.match(api, /projectDataImportLifecycle/);
  assert.match(api, /batches: batches\.map/);
  assert.match(api, /status: batch\.status, role/);
  assert.match(api, /admin\.profile\.role/);
});

test("Data Import UIs consume projected actions instead of inferring lifecycle buttons", () => {
  assert.match(workspace, /batch\.lifecycle\?\.availableActions/);
  assert.match(archive, /batch\.lifecycle\?\.availableActions/);
  assert.match(workspace, /StandardConfirmDialog/);
  assert.match(archive, /StandardConfirmDialog/);
  assert.doesNotMatch(workspace, /window\.(confirm|prompt|alert)\s*\(/);
  assert.doesNotMatch(archive, /window\.(confirm|prompt|alert)\s*\(/);
  assert.doesNotMatch(workspace, /batch\.status === "ready"/);
  assert.doesNotMatch(workspace, /\["imported", "rejected"\]\.includes\(batch\.status\)/);
  assert.doesNotMatch(archive, /onClick=\{\(\) => act\(batch/);
});

test("Data Import mutations remain behind atomic RPC boundaries", () => {
  assert.match(api, /rpc\/admin_stage_organization_intake_batch/);
  assert.match(api, /rpc\/import_organization_intake_batch/);
  assert.match(api, /rpc\/admin_transition_data_import_batch/);
  assert.match(api, /rpc\/admin_delete_archived_data_import_batch/);
  assert.match(migration, /for update/);
  assert.match(migration, /private\.is_staff/);
  assert.match(migration, /private\.is_staff\(array\['admin'\]::public\.staff_role\[\]\)/);
  assert.match(migration, /audit_events/);
});
