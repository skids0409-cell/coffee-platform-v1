import { createHash, randomBytes } from "node:crypto";
import { adminRest, supabaseAuth } from "@/lib/supabase-admin";

export const recoveryCookieName = "coffee_password_recovery";
export const verifierCookieName = "coffee_password_verifier";

export function applicationOrigin(request: Request) {
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.hostname === "localhost") return url.origin;
    } catch {
      // Fall through to the request origin if the optional value is malformed.
    }
  }
  return new URL(request.url).origin;
}

export function createRecoveryPkce() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${escapedName}=([^;]+)`));
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

export function secureCookie(name: string, value: string, maxAge: number, sameSite = "Strict") {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
}

export function clearCookie(name: string) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function validateActiveAdminToken(token: string) {
  if (!token) return null;
  const userResponse = await supabaseAuth("user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id?: string; email?: string };
  if (!user.id) return null;
  const profiles = await adminRest<Array<{ role: string; is_active: boolean }>>(
    token,
    `profiles?select=role,is_active&id=eq.${user.id}&limit=1`,
  ).catch(() => []);
  if (profiles[0]?.role !== "admin" || profiles[0]?.is_active !== true) return null;
  return { id: user.id, email: user.email || "" };
}
