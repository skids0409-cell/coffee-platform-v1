import { adminConfigured, sameOrigin, supabaseAuth } from "@/lib/supabase-admin";
import {
  clearCookie,
  readCookie,
  recoveryCookieName,
  validateActiveAdminToken,
  verifierCookieName,
} from "@/lib/password-recovery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ updated: false, reason: "not_configured" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ updated: false, reason: "origin_rejected" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { password?: string; confirmation?: string } | null;
  const password = body?.password || "";
  if (password.length < 12 || password.length > 128 || password !== body?.confirmation) {
    return Response.json({ updated: false, reason: "invalid_password" }, { status: 400 });
  }

  const token = readCookie(request, recoveryCookieName);
  const admin = await validateActiveAdminToken(token);
  if (!admin) return Response.json({ updated: false, reason: "recovery_expired" }, { status: 401 });

  const response = await supabaseAuth("user", {
    method: "PUT",
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    return Response.json({ updated: false, reason: response.status === 422 ? "weak_password" : "update_failed" }, { status: response.status === 422 ? 400 : 502 });
  }

  await supabaseAuth("logout?scope=global", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => null);

  const headers = new Headers({ "content-type": "application/json", "cache-control": "no-store" });
  for (const name of [recoveryCookieName, verifierCookieName, "coffee_admin_session", "coffee_partner_session"]) {
    headers.append("set-cookie", clearCookie(name));
  }
  return new Response(JSON.stringify({ updated: true }), { status: 200, headers });
}
