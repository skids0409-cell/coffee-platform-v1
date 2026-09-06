import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");
const oldType = 'adminRest<Array<{ id: string; public_reference: string; request_type: string; page_path: string; subject: string; message: string; preferred_channel: string; status: string; priority: string; assigned_to: string | null; internal_notes: string | null; resolution_note: string | null; technical_reference: string | null; created_at: string; updated_at: string }>>(';
const newType = 'adminRest<Array<{ id: string; public_reference: string; request_type: string; page_path: string; subject: string; message: string; preferred_channel: string; requester_name: string | null; requester_phone: string | null; requester_email: string | null; status: string; priority: string; assigned_to: string | null; internal_notes: string | null; resolution_note: string | null; technical_reference: string | null; escalated_at: string | null; customer_replied_at: string | null; archived_at: string | null; created_at: string; updated_at: string }>>(';
if (!source.includes(oldType)) throw new Error("support request type marker missing");
source = source.replace(oldType, newType);
writeFileSync(path, source);
console.log("Support request API type now matches selected projection fields");
