import { adminConfigured, supabaseAuth } from "@/lib/supabase-admin";
import {
  applicationOrigin,
  clearCookie,
  readCookie,
  recoveryCookieName,
  secureCookie,
  validateActiveAdminToken,
  verifierCookieName,
} from "@/lib/password-recovery";

export const dynamic = "force-dynamic";

function redirectWithError(request: Request) {
  const url = new URL("/update-password", applicationOrigin(request));
  url.searchParams.set("error", "invalid_or_expired");
  const headers = new Headers({ location: url.toString(), "cache-control": "no-store" });
  headers.append("set-cookie", clearCookie(verifierCookieName));
  return new Response(null, { status: 303, headers });
}

function implicitRecoveryBridge() {
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>التحقق من رابط الاسترداد</title></head><body><main><h1>جارٍ التحقق من رابط الاسترداد…</h1><p>لا تغلق هذه الصفحة.</p></main><script>(()=>{const p=new URLSearchParams(location.hash.slice(1));const token=p.get("access_token");const type=p.get("type");const target=new URL("/update-password",location.origin);if(type!=="recovery"||!token){target.searchParams.set("error","invalid_or_expired");location.replace(target);return}fetch("/api/auth/recovery-session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accessToken:token})}).then(r=>{if(!r.ok)throw new Error("invalid");location.replace(target)}).catch(()=>{target.searchParams.set("error","invalid_or_expired");location.replace(target)})})()</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; script-src 'unsafe-inline'; connect-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    },
  });
}

export async function GET(request: Request) {
  if (!adminConfigured()) return redirectWithError(request);
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash") || "";
  const type = url.searchParams.get("type") || "";
  const code = url.searchParams.get("code") || "";
  let response: Response | null = null;

  if (tokenHash && type === "recovery") {
    response = await supabaseAuth("verify", {
      method: "POST",
      body: JSON.stringify({ token_hash: tokenHash, type: "recovery" }),
    });
  } else if (code) {
    const verifier = readCookie(request, verifierCookieName);
    if (verifier) {
      response = await supabaseAuth("token?grant_type=pkce", {
        method: "POST",
        body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      });
    }
  } else {
    return implicitRecoveryBridge();
  }

  if (!response?.ok) return redirectWithError(request);
  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  const token = payload.access_token || "";
  const admin = await validateActiveAdminToken(token);
  if (!admin) return redirectWithError(request);

  const destination = new URL("/update-password", applicationOrigin(request));
  const headers = new Headers({ location: destination.toString(), "cache-control": "no-store" });
  headers.append("set-cookie", secureCookie(recoveryCookieName, token, Math.min(payload.expires_in || 900, 900)));
  headers.append("set-cookie", clearCookie(verifierCookieName));
  return new Response(null, { status: 303, headers });
}
