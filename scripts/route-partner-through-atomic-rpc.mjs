import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/partner-submissions/route.ts";
const source = readFileSync(path, "utf8");
const startMarker = '  const next = body?.status || "";';
const endMarker = '  return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token)), canonical });';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error("partner review orchestration markers missing");

const replacement = `  const next = body?.status || "";
  const note = body?.reviewNote?.trim() || "";
  if (!uuid.test(body?.id || "") || !["in_review", "needs_changes", "approved", "rejected"].includes(next) || ((next === "needs_changes" || next === "rejected") && note.length < 10)) {
    return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  }
  try {
    const result = await adminRest<{ canonical?: Record<string, unknown> | null }>(staff.token, "rpc/admin_transition_partner_submission", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ p_submission_id: body!.id, p_next_status: next, p_review_note: note || null }),
    });
    return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token)), canonical: result?.canonical || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("partner_submission_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    if (message.includes("partner_submission_not_reviewable")) return Response.json({ updated: false, reason: "not_reviewable" }, { status: 409 });
    if (message.includes("review_note_required") || message.includes("invalid_partner_status") || message.includes("unsupported_partner_entity")) {
      return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    }
    if (message.includes("location_data_missing")) return Response.json({ updated: false, reason: "location_data_missing" }, { status: 400 });
    if (message.includes("canonical_write_failed")) return Response.json({ updated: false, reason: "canonical_write_failed" }, { status: 502 });
    throw error;
  }`;

writeFileSync(path, source.slice(0, start) + replacement + source.slice(end + endMarker.length));
console.log("partner review routed through atomic RPC");
