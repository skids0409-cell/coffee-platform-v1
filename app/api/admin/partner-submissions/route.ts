import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { projectPartnerLifecycle } from "@/lib/partner-lifecycle-projection";

const uuid = /^[0-9a-f-]{36}$/i;

async function loadPartnerQueue(token: string, role: string) {
  const submissions = await adminRest<Array<Record<string, unknown>>>(token, "partner_submissions?select=id,organization_id,submitted_by,entity_type,target_entity_id,payload,status,review_note,reviewed_at,created_at,updated_at,organizations(name_ar,slug)&status=in.(submitted,in_review,needs_changes)&order=updated_at.desc&limit=200");
  return submissions.map((row) => ({
    ...row,
    lifecycle: projectPartnerLifecycle({
      status: String(row.status || ""),
      role,
      entityType: String(row.entity_type || ""),
      payload: row.payload && typeof row.payload === "object" ? row.payload as Record<string, unknown> : {},
    }),
  }));
}

async function loadPartnerAdmin(token: string, role: string) {
  const [submissions, memberships, organizations] = await Promise.all([
    loadPartnerQueue(token, role),
    adminRest<Array<Record<string, unknown>>>(token, "organization_memberships?select=id,organization_id,user_id,member_role,status,approved_at,created_at,organizations(name_ar,slug)&order=created_at.desc&limit=300"),
    adminRest<Array<{ id: string; name_ar: string; slug: string }>>(token, "organizations?select=id,name_ar,slug&status=eq.published&order=name_ar.asc&limit=1500"),
  ]);
  return { submissions, memberships, organizations };
}

export async function GET(request: Request) {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return Response.json({ authenticated: false }, { status: 401 });
  return Response.json({ authenticated: true, ...(await loadPartnerAdmin(staff.token, staff.profile.role)) }, { headers: { "cache-control": "no-store" } });
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
    return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token, staff.profile.role)) });
  }
  const next = body?.status || "";
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
    return Response.json({ updated: true, ...(await loadPartnerAdmin(staff.token, staff.profile.role)), canonical: result?.canonical || null });
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
  }
}
