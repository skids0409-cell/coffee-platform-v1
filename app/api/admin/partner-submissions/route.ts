import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";

const uuid = /^[0-9a-f-]{36}$/i;
type PartnerSubmissionRow = { id: string; organization_id: string; entity_type: string; status: string; payload: Record<string, unknown> };

async function loadPartnerQueue(token: string) {
  return adminRest<Array<Record<string, unknown>>>(token, "partner_submissions?select=id,organization_id,submitted_by,entity_type,target_entity_id,payload,status,review_note,reviewed_at,created_at,updated_at,organizations(name_ar,slug)&status=in.(submitted,in_review,needs_changes)&order=updated_at.desc&limit=200");
}

async function loadPartnerAdmin(token: string) {
  const [submissions, memberships, organizations] = await Promise.all([
    loadPartnerQueue(token),
    adminRest<Array<Record<string, unknown>>>(token, "organization_memberships?select=id,organization_id,user_id,member_role,status,approved_at,created_at,organizations(name_ar,slug)&order=created_at.desc&limit=300"),
    adminRest<Array<{ id: string; name_ar: string; slug: string }>>(token, "organizations?select=id,name_ar,slug&status=eq.published&order=name_ar.asc&limit=1500"),
  ]);
  return { submissions, memberships, organizations };
}

export async function GET(request: Request) {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, ...(await loadPartnerAdmin(staff.token)) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false, reason: "origin_rejected" }, { status: 403 });
  const staff = await requireStaff(request, ["verifier", "admin"]).catch(() => null);
  if (!staff) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as null | { action?: string; id?: string; status?: string; reviewNote?: string; organizationId?: string; userId?: string; memberRole?: string };
  if (body?.action === "upsert_membership") {
    if (staff.profile.role !== "admin") return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
    if (!uuid.test(body.organizationId || "") || !uuid.test(body.userId || "") || !["owner", "manager", "editor"].includes(body.memberRole || "") || !["active", "suspended", "revoked"].includes(body.status || "")) return Response.json({ updated: false, reason: "invalid_membership" }, { status: 400 });
    const profile = await adminRest<Array<{ id: string }>>(staff.token, `profiles?select=id&id=eq.${body.userId}&limit=1`);
    const organization = await adminRest<Array<{ id: string }>>(staff.token, `organizations?select=id&id=eq.${body.organizationId}&limit=1`);
    if (!profile[0] || !organization[0]) return Response.json({ updated: false, reason: "profile_or_organization_missing" }, { status: 404 });
    await adminRest(staff.token, "organization_memberships?on_conflict=organization_id,user_id", { method: "POST", headers: { "content-type": "application/json", prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ organization_id: body.organizationId, user_id: body.userId, member_role: body.memberRole, status: body.status, approved_by: staff.user.id, approved_at: body.status === "active" ? new Date().toISOString() : null }) });
    return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token)) });
  }
  const next = body?.status || "";
  const note = body?.reviewNote?.trim() || "";
  if (!uuid.test(body?.id || "") || !["in_review", "needs_changes", "approved", "rejected"].includes(next) || ((next === "needs_changes" || next === "rejected") && note.length < 10)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  const rows = await adminRest<PartnerSubmissionRow[]>(staff.token, `partner_submissions?select=id,organization_id,entity_type,status,payload&id=eq.${body!.id}&limit=1`);
  const row = rows[0];
  if (!row || !["submitted", "in_review", "needs_changes"].includes(row.status)) return Response.json({ updated: false, reason: "not_reviewable" }, { status: 409 });

  let canonical: Record<string, unknown> | null = null;
  if (next === "approved") {
    const payload = row.payload || {};
    if (row.entity_type === "organization_update") {
      const allowed = ["name_ar", "name_en", "description_ar", "phone", "email", "website_url"];
      const patch = Object.fromEntries(allowed.filter((key) => typeof payload[key] === "string").map((key) => [key, String(payload[key]).trim() || null]));
      const updated = await adminRest<Array<Record<string, unknown>>>(staff.token, `organizations?id=eq.${row.organization_id}&select=id,name_ar,slug,status`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify(patch) });
      canonical = updated[0] || null;
    } else if (row.entity_type === "product_offer") {
      canonical = await adminRest<Record<string, unknown>>(staff.token, "rpc/admin_create_catalog_draft", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_entity_type: "offer", p_payload: { ...payload, seller_organization_id: row.organization_id, source_label: payload.source_label || "بوابة الجهة المشاركة", source_type: payload.source_type || "organization" } }) });
    } else if (row.entity_type === "new_product") {
      const contractRevision = await adminRest<string>(staff.token, "rpc/admin_record_contract_revision", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const created = await adminRest<Record<string, unknown>>(staff.token, "rpc/admin_create_product_draft_v2", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_payload: { ...payload, owner_organization_id: row.organization_id, source_label: payload.source_label || "بوابة الجهة المشاركة", source_type: payload.source_type || "organization" }, p_values: [], p_contract_revision: contractRevision }) });
      canonical = { ...created, status: "attached" };
    } else if (row.entity_type === "location") {
      const markets = await adminRest<Array<{ id: string }>>(staff.token, "markets?select=id&code=eq.IQ-BGD&limit=1");
      if (!markets[0] || String(payload.address_ar || "").trim().length < 3) return Response.json({ updated: false, reason: "location_data_missing" }, { status: 400 });
      const created = await adminRest<Array<Record<string, unknown>>>(staff.token, "locations?select=id,status", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ source_key: `LOC-PARTNER-${crypto.randomUUID().slice(0, 12).toUpperCase()}`, organization_id: row.organization_id, market_id: markets[0].id, name_ar: payload.name_ar || null, address_ar: String(payload.address_ar).trim(), district_ar: payload.district_ar || null, phone: payload.phone || null, opening_hours: payload.opening_hours || {}, services: payload.services || [], status: "draft" }) });
      canonical = created[0] || null;
    }
    if (!canonical) return Response.json({ updated: false, reason: "canonical_write_failed" }, { status: 502 });
  }
  await adminRest(staff.token, `partner_submissions?id=eq.${body!.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ status: next, review_note: note || null, reviewed_by: staff.user.id, reviewed_at: new Date().toISOString(), payload: canonical ? { ...row.payload, canonical_result: canonical } : row.payload }) });
  await adminRest(staff.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: staff.user.id, action: `partner_submission_${next}`, entity_table: "partner_submissions", entity_id: body!.id, before_data: { status: row.status }, after_data: { status: next, review_note: note || null, canonical }, source: "partner_review" }) });
  return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token)), canonical });
}
