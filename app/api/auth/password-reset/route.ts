import { adminConfigured, sameOrigin, supabaseAuth } from "@/lib/supabase-admin";
import {
  applicationOrigin,
  createRecoveryPkce,
  secureCookie,
  verifierCookieName,
} from "@/lib/password-recovery";

export const dynamic = "force-dynamic";

const attempts = new Map<string, number[]>();

function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 5) return true;
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

export async function POST(request: Request) {
  if (!adminConfigured()) return Response.json({ accepted: false, reason: "not_configured" }, { status: 503 });
  if (!sameOrigin(request)) return Response.json({ accepted: false, reason: "origin_rejected" }, { status: 403 });
  if (rateLimited(request)) return Response.json({ accepted: false, reason: "rate_limited" }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() || "";
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ accepted: false, reason: "invalid_input" }, { status: 400 });
  }

  const { verifier, challenge } = createRecoveryPkce();
  const callback = new URL("/auth/callback", applicationOrigin(request));
  const response = await supabaseAuth(`recover?redirect_to=${encodeURIComponent(callback.toString())}`, {
    method: "POST",
    body: JSON.stringify({
      email,
      code_challenge: challenge,
      code_challenge_method: "s256",
    }),
  });

  if (!response.ok && response.status === 429) {
    return Response.json({ accepted: false, reason: "rate_limited" }, { status: 429 });
  }
  if (!response.ok) {
    return Response.json({ accepted: false, reason: "delivery_failed" }, { status: 502 });
  }

  return new Response(JSON.stringify({ accepted: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      "set-cookie": secureCookie(verifierCookieName, verifier, 900, "Lax"),
    },
  });
}
