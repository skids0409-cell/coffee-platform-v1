import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function actionBlock(source, action, nextMarker) {
  const start = source.indexOf(`if (body?.action === "${action}")`);
  assert.notEqual(start, -1, `${action} branch missing`);
  const end = source.indexOf(nextMarker, start);
  assert.notEqual(end, -1, `${action} branch end missing`);
  return source.slice(start, end);
}

test("rights lifecycle enters the atomic RPC and has no direct write fallback", () => {
  const route = read("../app/api/admin/review/route.ts");
  const block = actionBlock(route, "process_rights_request", "\n  if (\n    !body?.table");
  assert.match(block, /rpc\/admin_transition_rights_request/);
  assert.doesNotMatch(block, /rights_requests\?id=.*method:\s*"PATCH"/s);
  assert.doesNotMatch(block, /"audit_events"/);
});

test("rights RPC locks state, authorizes verifier/admin and audits atomically", () => {
  const migration = read("../supabase/migrations/057_atomic_rights_request_transition.sql");
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path=''/i);
  assert.match(migration, /private\.is_staff\(array\['verifier','admin'\]::public\.staff_role\[\]\)/);
  assert.match(migration, /for update/i);
  assert.match(migration, /resolution_note_required/);
  assert.match(migration, /v_current='submitted'.*p_next_status in \('in_review','needs_evidence'\)/s);
  assert.match(migration, /v_current='needs_evidence'.*p_next_status='in_review'/s);
  assert.match(migration, /v_current='in_review'.*p_next_status in \('needs_evidence','approved','rejected','closed'\)/s);
  assert.match(migration, /insert into public\.audit_events/);
  assert.match(migration, /rights_atomic_transition_v1/);
  assert.match(migration, /revoke all .* from public,anon/i);
  assert.match(migration, /grant execute .* to authenticated/i);
});

test("support mutations use purpose-built atomic RPCs without direct write fallbacks", () => {
  const route = read("../app/api/admin/review/route.ts");
  const updateBlock = actionBlock(route, "update_support_request", '\n  if (body?.action === "delete_support_request")');
  const deleteBlock = actionBlock(route, "delete_support_request", '\n  if (body?.action === "mark_support_escalated"');
  const eventStart = route.indexOf('if (body?.action === "mark_support_escalated" || body?.action === "mark_support_reply")');
  const eventEnd = route.indexOf('\n  if (body?.action === "delete_catalog_record")', eventStart);
  const eventBlock = route.slice(eventStart, eventEnd);

  assert.match(updateBlock, /rpc\/admin_update_support_request/);
  assert.match(deleteBlock, /rpc\/admin_delete_archived_support_request/);
  assert.match(eventBlock, /rpc\/admin_mark_support_event/);
  for (const block of [updateBlock, deleteBlock, eventBlock]) {
    assert.doesNotMatch(block, /support_requests\?id=.*method:\s*"(?:PATCH|DELETE)"/s);
    assert.doesNotMatch(block, /"audit_events"/);
  }
});

test("support RPCs lock rows, preserve role boundaries and audit inside transactions", () => {
  const migration = read("../supabase/migrations/058_atomic_support_request_boundaries.sql");
  assert.match(migration, /admin_update_support_request/);
  assert.match(migration, /admin_mark_support_event/);
  assert.match(migration, /admin_delete_archived_support_request/);
  assert.equal((migration.match(/security invoker/gi) || []).length, 3);
  assert.ok((migration.match(/for update/gi) || []).length >= 3);
  assert.match(migration, /private\.is_staff\(array\['admin'\]::public\.staff_role\[\]\)/);
  assert.match(migration, /contact_or_resolution_missing/);
  assert.match(migration, /archived_request_required/);
  assert.match(migration, /support_atomic_update_v1/);
  assert.match(migration, /support_atomic_event_v1/);
  assert.match(migration, /support_atomic_delete_v1/);
  assert.ok((migration.match(/revoke all .* from public,anon/gi) || []).length >= 3);
  assert.ok((migration.match(/grant execute .* to authenticated/gi) || []).length >= 3);
});

test("operational inbox remains a read-only projection while operational boundaries become atomic", () => {
  const inbox = read("../app/api/admin/work-queue/route.ts");
  assert.doesNotMatch(inbox, /export async function (POST|PATCH|DELETE)/);
  assert.match(inbox, /rights_requests\?select=/);
  assert.match(inbox, /support_requests\?select=/);
});
