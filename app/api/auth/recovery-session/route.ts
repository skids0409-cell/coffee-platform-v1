import { adminConfigured, sameOrigin } from "@/lib/supabase-admin";
import {
  recoveryCookieName,
  secureCookie,
  validateActiveAdminToken,
} from "@/lib/password-recovery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ accepted: false, reason: "not_configured" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ accepted: false, reason: "origin_rejected" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { accessToken?: string } | null;
  const token = body?.accessToken || "";
  if (token.length < 20 || token.length > 5000) {
    return Response.json({ accepted: false, reason: "invalid_token" }, { status: 400 });
  }
  const admin = await validateActiveAdminToken(token);
  if (!admin) return Response.json({ accepted: false, reason: "not_authorized" }, { status: 403 });
  return new Response(JSON.stringify({ accepted: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": secureCookie(recoveryCookieName, token, 900, "Lax"),
    },
  });
}
