import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/data-center/route.ts";
let source = readFileSync(path, "utf8");
const replaceExact = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`missing ${label} marker`);
  source = source.replace(before, after);
};

const stageStart = source.indexOf("async function stageRows(");
const stageEnd = source.indexOf("\n\nexport async function GET", stageStart);
if (stageStart < 0 || stageEnd < 0) throw new Error("stageRows boundaries missing");
const stageReplacement = `async function stageRows(
  token: string,
  sourceLabel: string,
  rows: ReturnType<typeof validateOrganizationCsv>["rows"],
) {
  const validRows = rows.filter((row) => row.status !== "invalid").length;
  if (!validRows) return { created: false, reason: "no_valid_rows", rows } as const;
  const stagedRows = rows.map((row) => ({
    source_row_number: row.sourceRowNumber,
    dedupe_key: row.status === "invalid" ? null : \`${"${row.normalized.name_ar}|${row.normalized.address_ar}"}\`.toLocaleLowerCase("ar-IQ"),
    raw_payload: row.raw,
    normalized_payload: row.normalized,
    validation_status: row.status,
    validation_messages: row.messages,
  }));
  const staged = await adminRest<{ created: true; batch: BatchRow }>(token, "rpc/admin_stage_organization_intake_batch", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify({ p_source_label: sourceLabel, p_rows: stagedRows }),
  });
  if (!staged?.batch) throw new Error("batch_create_failed");
  return { created: true, batch: staged.batch, rows } as const;
}`;
source = source.slice(0, stageStart) + stageReplacement + source.slice(stageEnd);

replaceExact(
  "const staged = await stageRows(admin.token, admin.user.id, sourceLabel, validated.rows);",
  "const staged = await stageRows(admin.token, sourceLabel, validated.rows);",
  "stageRows call",
);

const transitionBefore = `    if (body?.action === "archive_batch" || body?.action === "restore_batch") {
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      const rows = await adminRest<BatchRow[]>(admin.token, \`data_import_batches?select=*&id=eq.\${body.batchId}&limit=1\`);
      const batch = rows[0];
      if (!batch) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      const next = body.action === "archive_batch" ? "archived" : (batch.imported_at ? "imported" : "rejected");
      if (body.action === "archive_batch" && !["imported", "rejected"].includes(batch.status)) return Response.json({ updated: false, reason: "batch_not_complete" }, { status: 409 });
      await adminRest(admin.token, \`data_import_batches?id=eq.\${body.batchId}\`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ status: next }) });
      await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: body.action, entity_table: "data_import_batches", entity_id: body.batchId, before_data: { status: batch.status }, after_data: { status: next }, source: "data_center_ui" }) });
      return Response.json({ updated: true, ...(await loadDataCenter(admin.token)) });
    }`;
const transitionAfter = `    if (body?.action === "archive_batch" || body?.action === "restore_batch") {
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      try {
        await adminRest(admin.token, "rpc/admin_transition_data_import_batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ p_batch_id: body.batchId, p_action: body.action === "archive_batch" ? "archive" : "restore" }),
        });
        return Response.json({ updated: true, ...(await loadDataCenter(admin.token)) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("batch_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
        if (message.includes("batch_not_complete")) return Response.json({ updated: false, reason: "batch_not_complete" }, { status: 409 });
        if (message.includes("archived_batch_required")) return Response.json({ updated: false, reason: "archived_batch_required" }, { status: 409 });
        throw error;
      }
    }`;
replaceExact(transitionBefore, transitionAfter, "archive restore block");

const deleteBefore = `    if (body?.action === "delete_archived_batch") {
      if (admin.profile.role !== "admin") return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      const rows = await adminRest<BatchRow[]>(admin.token, \`data_import_batches?select=*&id=eq.\${body.batchId}&limit=1\`);
      const batch = rows[0];
      if (!batch || batch.status !== "archived") return Response.json({ updated: false, reason: "archived_batch_required" }, { status: 409 });
      const intakeRows = await adminRest<Array<{ id: string }>>(admin.token, \`data_intake_rows?select=id&batch_id=eq.\${body.batchId}&limit=1000\`);
      await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "delete_archived_batch", entity_table: "data_import_batches", entity_id: body.batchId, before_data: { batch_code: batch.batch_code, status: batch.status, intake_rows: intakeRows.length }, after_data: { deleted: true }, source: "data_center_ui" }) });
      await adminRest(admin.token, \`data_import_batches?id=eq.\${body.batchId}\`, { method: "DELETE", headers: { prefer: "return=minimal" } });
      return Response.json({ updated: true, deletedRows: intakeRows.length, ...(await loadDataCenter(admin.token)) });
    }`;
const deleteAfter = `    if (body?.action === "delete_archived_batch") {
      if (admin.profile.role !== "admin") return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      try {
        const result = await adminRest<{ deleted_rows?: number }>(admin.token, "rpc/admin_delete_archived_data_import_batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ p_batch_id: body.batchId }),
        });
        return Response.json({ updated: true, deletedRows: result?.deleted_rows || 0, ...(await loadDataCenter(admin.token)) });
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("batch_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
        if (message.includes("archived_batch_required")) return Response.json({ updated: false, reason: "archived_batch_required" }, { status: 409 });
        throw error;
      }
    }`;
replaceExact(deleteBefore, deleteAfter, "delete archived batch block");

writeFileSync(path, source);
console.log("data import writes routed through atomic RPCs");
