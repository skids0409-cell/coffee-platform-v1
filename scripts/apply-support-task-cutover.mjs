import fs from 'node:fs';

const path = 'app/api/admin/review/route.ts';
let src = fs.readFileSync(path, 'utf8');
function once(from, to) {
  if (!src.includes(from)) throw new Error(`marker not found: ${from.slice(0, 160)}`);
  src = src.replace(from, to);
}

once(
  'adminRest<Array<{ id: string; public_reference: string; request_type: string; page_path: string; subject: string; message: string; preferred_channel: string; requester_name: string | null; requester_phone: string | null; requester_email: string | null; status: string; priority: string; assigned_to: string | null; internal_notes: string | null; resolution_note: string | null; technical_reference: string | null; escalated_at: string | null; customer_replied_at: string | null; archived_at: string | null; created_at: string; updated_at: string }>>(\n      token,\n      "support_requests?select=id,public_reference,request_type,page_path,subject,message,preferred_channel,requester_name,requester_phone,requester_email,status,priority,assigned_to,internal_notes,resolution_note,technical_reference,escalated_at,customer_replied_at,archived_at,created_at,updated_at&order=created_at.desc&limit=200",\n    )',
  'adminRest<Array<{ id: string; public_reference: string; request_type: string; page_path: string; subject: string; message: string; preferred_channel: string; requester_name: string | null; requester_phone: string | null; requester_email: string | null; status: string; priority: string; assigned_to: string | null; internal_notes: string | null; resolution_note: string | null; technical_reference: string | null; technical_task_id: string | null; technical_task: { id: string; task_code: string; title: string; status: string } | null; escalated_at: string | null; customer_replied_at: string | null; archived_at: string | null; created_at: string; updated_at: string }>>(\n      token,\n      "support_requests?select=id,public_reference,request_type,page_path,subject,message,preferred_channel,requester_name,requester_phone,requester_email,status,priority,assigned_to,internal_notes,resolution_note,technical_reference,technical_task_id,technical_task:technical_tasks(id,task_code,title,status),escalated_at,customer_replied_at,archived_at,created_at,updated_at&order=created_at.desc&limit=200",\n    )'
);

once('await adminRest(admin.token, "rpc/admin_update_support_request", {', 'await adminRest(admin.token, "rpc/admin_update_support_request_v2", {');
once(
  '          p_resolution_note: String(body.resolutionNote || "").trim().slice(0, 4000) || null,\n          p_technical_reference: String(body.technicalReference || "").trim().slice(0, 300) || null,',
  '          p_resolution_note: String(body.resolutionNote || "").trim().slice(0, 4000) || null,\n          p_technical_task_id: body.technicalTaskId && /^[0-9a-f-]{36}$/i.test(body.technicalTaskId) ? body.technicalTaskId : null,'
);
once(
  '      if (message.includes("invalid_support_")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });',
  '      if (message.includes("invalid_support_assignee")) return Response.json({ updated: false, reason: "invalid_support_assignee" }, { status: 409 });\n      if (message.includes("technical_task_not_found")) return Response.json({ updated: false, reason: "technical_task_not_found" }, { status: 404 });\n      if (message.includes("closed_technical_task_not_assignable")) return Response.json({ updated: false, reason: "closed_technical_task_not_assignable" }, { status: 409 });\n      if (message.includes("invalid_support_")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });'
);

if (src.includes('p_technical_reference: String(body.technicalReference')) throw new Error('legacy technical reference write remains');
if (src.includes('rpc/admin_update_support_request\",')) throw new Error('legacy support RPC remains');
fs.writeFileSync(path, src);
console.log('support technical task cutover applied');
