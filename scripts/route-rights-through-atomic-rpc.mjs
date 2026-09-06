import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
const source = readFileSync(path, "utf8");
const before = `  if (body?.action === "process_rights_request") {
    if (!canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    const next = String(body.status || "");
    const final = ["approved","rejected","closed"].includes(next);
    const note = String(body.resolutionNote || "").trim().slice(0,4000);
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !["needs_evidence","in_review","approved","rejected","closed"].includes(next) || (final && note.length < 10)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, \`rights_requests?select=*&id=eq.\${body.id}&limit=1\`);
    if (!existing[0]) return Response.json({ updated:false,reason:"not_found" },{status:404});
    const after = { status: next, resolution_note: note || null, assigned_to: admin.user.id, closed_at: final ? new Date().toISOString() : null };
    await adminRest(admin.token, \`rights_requests?id=eq.\${body.id}\`, { method:"PATCH",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(after) });
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:\`process_rights_\${next}\`,entity_table:"rights_requests",entity_id:body.id,before_data:existing[0],after_data:after,source:"operations_center_v5"})});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }`;

const after = `  if (body?.action === "process_rights_request") {
    if (!canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    const next = String(body.status || "");
    const final = ["approved", "rejected", "closed"].includes(next);
    const note = String(body.resolutionNote || "").trim().slice(0, 4000);
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !["needs_evidence", "in_review", "approved", "rejected", "closed"].includes(next) || (final && note.length < 10)) {
      return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    }
    try {
      await adminRest(admin.token, "rpc/admin_transition_rights_request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p_request_id: body.id, p_next_status: next, p_resolution_note: note || null }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("rights_request_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("illegal_rights_transition") || message.includes("rights_state_unchanged")) return Response.json({ updated: false, reason: "illegal_transition" }, { status: 409 });
      if (message.includes("resolution_note_required")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      throw error;
    }
  }`;

if (!source.includes(before)) throw new Error("rights direct-write block not found");
writeFileSync(path, source.replace(before, after));
console.log("rights transition routed through atomic RPC");
