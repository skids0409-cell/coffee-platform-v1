import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");
const replaceExact = (before, after, label) => {
  if (!source.includes(before)) throw new Error(`missing ${label} block`);
  source = source.replace(before, after);
};

replaceExact(
`  if (body?.action === "update_support_request") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !supportStatuses.includes(body.status || "") || !["low", "normal", "high", "urgent"].includes(body.priority || "")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<Array<Record<string, unknown>>>(admin.token, \`support_requests?select=*&id=eq.\${body.id}&limit=1\`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    const after = { status: body.status, priority: body.priority, assigned_to: body.assignedTo && /^[0-9a-f-]{36}$/i.test(body.assignedTo) ? body.assignedTo : null, internal_notes: String(body.internalNotes || "").trim().slice(0, 4000) || null, resolution_note: String(body.resolutionNote || "").trim().slice(0, 4000) || null, technical_reference: String(body.technicalReference || "").trim().slice(0, 300) || null, resolved_at: ["resolved", "closed", "archived"].includes(body.status || "") ? (existing[0].resolved_at || new Date().toISOString()) : null, archived_at: body.status === "archived" ? new Date().toISOString() : null };
    await adminRest(admin.token, \`support_requests?id=eq.\${body.id}\`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(after) });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "process_support_request", entity_table: "support_requests", entity_id: body.id, before_data: existing[0], after_data: after, source: "operations_center_v2" }) });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }`,
`  if (body?.action === "update_support_request") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !supportStatuses.includes(body.status || "") || !["low", "normal", "high", "urgent"].includes(body.priority || "")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_update_support_request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_request_id: body.id,
          p_status: body.status,
          p_priority: body.priority,
          p_assigned_to: body.assignedTo && /^[0-9a-f-]{36}$/i.test(body.assignedTo) ? body.assignedTo : null,
          p_internal_notes: String(body.internalNotes || "").trim().slice(0, 4000) || null,
          p_resolution_note: String(body.resolutionNote || "").trim().slice(0, 4000) || null,
          p_technical_reference: String(body.technicalReference || "").trim().slice(0, 300) || null,
        }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("support_request_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("invalid_support_")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      throw error;
    }
  }`,
"update_support_request");

replaceExact(
`  if (body?.action === "delete_support_request") {
    if (!isOwnerAdmin) return Response.json({ updated:false,reason:"admin_required" },{status:403});
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated:false,reason:"invalid_input" },{status:400});
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, \`support_requests?select=*&id=eq.\${body.id}&status=eq.archived&limit=1\`);
    if (!existing[0]) return Response.json({ updated:false,reason:"archived_request_required" },{status:409});
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:"delete_archived_support_request",entity_table:"support_requests",entity_id:body.id,before_data:existing[0],after_data:{deleted:true},source:"support_desk"})});
    await adminRest(admin.token,\`support_requests?id=eq.\${body.id}\`,{method:"DELETE",headers:{prefer:"return=minimal"}});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }`,
`  if (body?.action === "delete_support_request") {
    if (!isOwnerAdmin) return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_delete_archived_support_request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p_request_id: body.id }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("support_request_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("archived_request_required")) return Response.json({ updated: false, reason: "archived_request_required" }, { status: 409 });
      throw error;
    }
  }`,
"delete_support_request");

replaceExact(
`  if (body?.action === "mark_support_escalated" || body?.action === "mark_support_reply") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated:false,reason:"invalid_input" },{status:400});
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, \`support_requests?select=*&id=eq.\${body.id}&limit=1\`);
    if (!existing[0]) return Response.json({ updated:false,reason:"not_found" },{status:404});
    if (body.action === "mark_support_reply" && (!String(existing[0].requester_phone || "").trim() || String(existing[0].resolution_note || "").trim().length < 3)) return Response.json({ updated:false,reason:"contact_or_resolution_missing" },{status:409});
    const field = body.action === "mark_support_escalated" ? "escalated_at" : "customer_replied_at";
    const after = { [field]: new Date().toISOString() };
    await adminRest(admin.token,\`support_requests?id=eq.\${body.id}\`,{method:"PATCH",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(after)});
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:body.action,entity_table:"support_requests",entity_id:body.id,after_data:after,source:"support_desk"})});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }`,
`  if (body?.action === "mark_support_escalated" || body?.action === "mark_support_reply") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_mark_support_event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p_request_id: body.id, p_event: body.action === "mark_support_escalated" ? "escalated" : "reply" }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("support_request_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("contact_or_resolution_missing")) return Response.json({ updated: false, reason: "contact_or_resolution_missing" }, { status: 409 });
      throw error;
    }
  }`,
"support events");

writeFileSync(path, source);
console.log("support mutations routed through atomic RPCs");
