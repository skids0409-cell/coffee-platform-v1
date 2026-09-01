import { adminConfigured, adminRest, sameOrigin, supabaseAuth } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ authenticated: false, reason: "not_configured" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ authenticated: false, reason: "origin_rejected" }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  const password = body?.password || "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) return Response.json({ authenticated: false, reason: "invalid_input" }, { status: 400 });
  const response = await supabaseAuth("token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  if (!response.ok) return Response.json({ authenticated: false, reason: "invalid_credentials" }, { status: 401 });
  const payload = await response.json() as { access_token: string; expires_in: number; user?: { id?: string } };
  const userId = payload.user?.id || "";
  const memberships = userId ? await adminRest<Array<{ id: string }>>(payload.access_token, `organization_memberships?select=id&user_id=eq.${userId}&status=eq.active&limit=1`).catch(() => []) : [];
  if (!memberships.length) return Response.json({ authenticated: false, reason: "active_membership_required" }, { status: 403 });
  return new Response(JSON.stringify({ authenticated: true }), { status: 200, headers: {
    "content-type": "application/json", "cache-control": "no-store",
    "set-cookie": `coffee_partner_session=${encodeURIComponent(payload.access_token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.min(payload.expires_in || 3600, 3600)}`,
  }});
}
