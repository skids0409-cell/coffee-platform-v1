import { adminRest, requirePartner, sameOrigin } from "@/lib/supabase-admin";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const entityTypes = ["organization_update", "location", "product_offer", "new_product"];

export async function GET(request: Request) {
  const partner = await requirePartner(request).catch(() => null);
  if (!partner) return Response.json({ authenticated: false }, { status: 401 });
  const organizationIds = partner.memberships.map((row) => row.organization_id);
  const [submissions, products, categories] = await Promise.all([
    adminRest<Array<Record<string, unknown>>>(partner.token, `partner_submissions?select=id,organization_id,entity_type,target_entity_id,payload,idempotency_key,client_updated_at,status,review_note,reviewed_at,created_at,updated_at&organization_id=in.(${organizationIds.join(",")})&order=updated_at.desc&limit=200`),
    adminRest<Array<{ id: string; name_ar: string; product_kind: string }>>(partner.token, "products?select=id,name_ar,product_kind&status=eq.published&order=name_ar.asc&limit=1000"),
    adminRest<Array<{ id: string; code: string; name_ar: string; parent_id: string | null }>>(partner.token, "categories?select=id,code,name_ar,parent_id&status=eq.published&order=sort_order.asc&limit=1000"),
  ]);
  return Response.json({ authenticated: true, user: { email: partner.user.email }, memberships: partner.memberships, submissions, products, categories }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ saved: false, reason: "origin_rejected" }, { status: 403 });
  const partner = await requirePartner(request).catch(() => null);
  if (!partner) return Response.json({ saved: false, reason: "not_authenticated" }, { status: 401 });
  const body = await request.json().catch(() => null) as null | { organizationId?: string; entityType?: string; targetEntityId?: string | null; payload?: Record<string, unknown>; idempotencyKey?: string; clientUpdatedAt?: string; status?: string };
  if (!body || !uuid.test(body.organizationId || "") || !uuid.test(body.idempotencyKey || "") || !entityTypes.includes(body.entityType || "") || !["draft", "submitted"].includes(body.status || "") || !body.payload || typeof body.payload !== "object") return Response.json({ saved: false, reason: "invalid_input" }, { status: 400 });
  if (!partner.memberships.some((row) => row.organization_id === body.organizationId)) return Response.json({ saved: false, reason: "membership_required" }, { status: 403 });
  const clientUpdatedAt = new Date(body.clientUpdatedAt || "");
  if (!Number.isFinite(clientUpdatedAt.getTime())) return Response.json({ saved: false, reason: "invalid_client_time" }, { status: 400 });
  const existing = await adminRest<Array<{ id: string; status: string; updated_at: string }>>(partner.token, `partner_submissions?select=id,status,updated_at&submitted_by=eq.${partner.user.id}&idempotency_key=eq.${body.idempotencyKey}&limit=1`);
  if (existing[0]) return Response.json({ saved: true, duplicate: true, submission: existing[0] });
  const created = await adminRest<Array<Record<string, unknown>>>(partner.token, "partner_submissions?select=*", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ organization_id: body.organizationId, submitted_by: partner.user.id, entity_type: body.entityType, target_entity_id: body.targetEntityId && uuid.test(body.targetEntityId) ? body.targetEntityId : null, payload: body.payload, idempotency_key: body.idempotencyKey, client_updated_at: clientUpdatedAt.toISOString(), status: body.status }) });
  return Response.json({ saved: true, duplicate: false, submission: created[0] }, { status: 201 });
}
