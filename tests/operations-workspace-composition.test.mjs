import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const composition = fs.readFileSync("app/ui/admin/governance/OperationsWorkspaceComposition.tsx", "utf8");
const shell = fs.readFileSync("app/ui/admin/OperationsWorkspaceShell.tsx", "utf8");

test("all Operations workspaces receive an explicit operator composition", () => {
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
  ]) assert.match(composition, new RegExp(`${workspace}:`));
});

test("workspace composition exposes the standard command-to-action operating path", () => {
  assert.match(composition, /Command Summary/);
  assert.match(composition, /Master List/);
  assert.match(composition, /Inspector/);
  assert.match(composition, /Relationships/);
  assert.match(composition, /Audit/);
  assert.match(composition, /Governed Actions/);
  assert.match(composition, /Asset Master/);
  assert.match(composition, /Preservation/);
  assert.match(composition, /Disposition/);
});

test("visual normalization is scoped to the Operations center root", () => {
  assert.match(shell, /data-operations-center-root="true"/);
  assert.match(shell, /data-workspace-composition-contract="command-master-inspector-v1"/);
  assert.match(composition, /\[data-operations-center-root="true"\]/);
  assert.match(composition, /data-workspace-composition="command-master-inspector-v1"/);
});

test("composition is state-driven and presentation-only", () => {
  assert.doesNotMatch(composition, /fetch\(/);
  assert.doesNotMatch(composition, /method:\s*["'](?:POST|PATCH|DELETE)["']/);
  assert.doesNotMatch(composition, /MutationObserver|createPortal|document\./);
  assert.match(composition, /workspace: OperationsWorkspaceId/);
  assert.match(shell, /<OperationsWorkspaceComposition workspace=\{workspace\} \/>/);
});

test("composition contract has responsive tablet and mobile layouts", () => {
  assert.match(composition, /@media \(max-width: 820px\)/);
  assert.match(composition, /@media \(max-width: 520px\)/);
  assert.match(composition, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
