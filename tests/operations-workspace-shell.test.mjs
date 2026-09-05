import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const shellPath = new URL("../app/ui/admin/OperationsWorkspaceShell.tsx", import.meta.url);

test("operations shell owns the unified governed navigation contract", async () => {
  const source = await readFile(shellPath, "utf8");
  assert.match(source, /data-workspace-contract="command-master-inspector-v1"/);
  assert.match(source, /data-operations-shell="governed-v1"/);
  assert.match(source, /operations-workspace-nav/);
  assert.match(source, /aria-current=/);
  assert.match(source, /Governed Operations Center/);
  assert.match(source, /حاجز النشر مفعّل/);
  assert.match(source, /OperationsWorkspaceChrome/);
  assert.match(source, /OperationsCenterArchitecture/);
  assert.match(source, /OperationsWorkspaceComposition/);
});

test("operations shell keeps taxonomy role-gated and never performs backend mutations", async () => {
  const source = await readFile(shellPath, "utf8");
  assert.match(source, /value !== "taxonomy" \|\| canManageTaxonomy/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /createClient/);
  assert.doesNotMatch(source, /supabase/i);
});

test("operations shell exposes every current operations workspace without silently dropping functions", async () => {
  const source = await readFile(shellPath, "utf8");
  for (const workspace of [
    "dashboard",
    "records",
    "entry",
    "review",
    "partners",
    "media",
    "imports",
    "search",
    "requests",
    "archive",
    "taxonomy",
  ]) assert.match(source, new RegExp(`"${workspace}"`));
  assert.match(source, /لم تُحذف أي وظيفة/);
});

test("shell emits architecture metadata directly without DOM discovery", async () => {
  const source = await readFile(shellPath, "utf8");
  assert.match(source, /data-architecture-navigation="true"/);
  assert.match(source, /data-architecture-group/);
  assert.match(source, /data-architecture-purpose/);
  assert.match(source, /data-operations-center-root="true"/);
  assert.doesNotMatch(source, /MutationObserver|createPortal|document\./);
});
