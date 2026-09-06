import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const projection = fs.readFileSync("lib/search-term-lifecycle-projection.ts", "utf8");
const route = fs.readFileSync("app/api/admin/review/route.ts", "utf8");
const controller = fs.readFileSync("app/ui/admin/OperationsController.tsx", "utf8");
const workspace = fs.readFileSync("app/ui/admin/SearchGovernanceWorkspace.tsx", "utf8");
const editor = fs.readFileSync("app/ui/admin/SearchTermEditForm.tsx", "utf8");

test("Search lifecycle projection exposes one revisioned server contract", () => {
  assert.match(projection, /SEARCH_TERM_LIFECYCLE_CONTRACT_REVISION\s*=\s*"search-governance\.lifecycle\.v1"/);
  for (const action of ["activate", "retire", "return_to_draft", "delete"]) assert.match(projection, new RegExp(`action: "${action}"`));
  assert.match(projection, /requiredRoles: \["verifier", "admin"\]/);
  assert.match(projection, /requiredRoles: \["admin"\]/);
  assert.match(projection, /editConfirmation/);
});

test("Review API attaches Search lifecycle projection from server-side role and state", () => {
  assert.match(route, /projectSearchTermLifecycle/);
  assert.match(route, /searchTerms\.map\(\(term\) => \(\{ \.\.\.term, lifecycle: projectSearchTermLifecycle\(\{ status: term\.status, role \}\) \}\)\)/);
  assert.match(route, /rpc\/admin_set_search_term_status/);
  assert.match(route, /rpc\/admin_delete_search_term/);
  assert.match(route, /rpc\/admin_update_search_term/);
});

test("Search UI consumes projected actions and confirmations without browser dialogs", () => {
  assert.match(workspace, /term\.lifecycle\.availableActions\.map/);
  assert.match(controller, /action\.apiAction/);
  assert.match(controller, /action\.confirmation\.required/);
  assert.match(controller, /onLifecycleAction=\{requestSearchTermAction\}/);
  assert.match(editor, /term\.lifecycle\.editConfirmation\.required/);
  assert.match(editor, /StandardConfirmDialog/);
  for (const source of [workspace, controller, editor]) assert.doesNotMatch(source, /window\.(confirm|prompt|alert)\s*\(/);
});

test("Search lifecycle buttons are not inferred from local status or role conditions", () => {
  assert.doesNotMatch(workspace, /term\.status\s*!==\s*"active"\s*&&\s*<button/);
  assert.doesNotMatch(workspace, /term\.status\s*===\s*"active"\s*&&\s*<button/);
  assert.doesNotMatch(controller, /next\s*===\s*"active"\s*&&\s*!window\.confirm/);
  assert.doesNotMatch(editor, /term\.status\s*===\s*"active"/);
});