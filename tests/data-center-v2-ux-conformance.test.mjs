import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("app/ui/admin/data-center-v2/DataCenterV2App.tsx", "utf8");
const catalog = fs.readFileSync("app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "utf8");
const shell = fs.readFileSync("app/ui/admin/OperationsWorkspaceShell.tsx", "utf8");
const media = fs.readFileSync("app/ui/admin/MediaVaultWorkspace.tsx", "utf8");

test("V2 operator chrome is Arabic-first", () => {
  for (const legacy of [
    ">Draft only<",
    ">read-only<",
    ">Imported / Rejected<",
    ">no duplicate authority<",
    ">Pending Technical Audit<",
    ">Quarantine / Legal Hold<",
    ">Disposal Requests<",
    ">Contextual Inspector<",
    ">Approve & Assign<",
    ">Reject & Quarantine<",
  ]) {
    assert.equal(app.includes(legacy), false, `V2 still exposes visible English: ${legacy}`);
    assert.equal(catalog.includes(legacy), false, `Catalog still exposes visible English: ${legacy}`);
    assert.equal(media.includes(legacy), false, `Media still exposes visible English: ${legacy}`);
  }
  assert.match(app, /مركز البيانات V2/);
  assert.match(catalog, /مسودة فقط/);
});

test("V2 specialist handoffs do not re-enter the legacy operations shell", () => {
  for (const workspace of ["review", "media", "search", "requests", "archive", "taxonomy"]) {
    assert.match(app, new RegExp(`/operations/data-center-v2/specialist\\?workspace=${workspace}`));
  }
  assert.match(shell, /data-v2-specialist-shell/);
  assert.match(shell, /العودة إلى مسارات الحوكمة/);
});
