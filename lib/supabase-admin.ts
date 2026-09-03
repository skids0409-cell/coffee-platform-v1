const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export function publicSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const url = new URL(SUPABASE_URL.trim());
    const publishableKey = SUPABASE_KEY.trim();
    if (url.protocol !== "https:" || !publishableKey) return null;
    return { url: url.origin, publishableKey };
  } catch {
    return null;
  }
}

export function adminConfigured() {
  return Boolean(publicSupabaseConfig());
}

export function readSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)coffee_admin_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function readPartnerSessionToken(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)coffee_partner_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function requirePartner(request: Request) {
  const token = readPartnerSessionToken(request);
  if (!token) return null;
  const userResponse = await supabaseAuth("user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id: string; email?: string };
  const memberships = await adminRest<Array<{
    id: string;
    organization_id: string;
    member_role: "owner" | "manager" | "editor";
    status: string;
    organizations: { id: string; slug: string; name_ar: string } | null;
  }>>(token, `organization_memberships?select=id,organization_id,member_role,status,organizations(id,slug,name_ar)&user_id=eq.${user.id}&status=eq.active&order=created_at.asc`);
  if (!memberships.length) return null;
  return { token, user, memberships };
}

export async function supabaseAuth(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("not_configured");
  return await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function adminRest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("not_configured");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`admin_rest_${response.status}:${detail.slice(0, 180)}`);
  }
  return await readAdminRestResponse<T>(response);
}

export async function readAdminRestResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body.trim()) return undefined as T;
  return JSON.parse(body) as T;
}

export type StaffRole = "editor" | "verifier" | "admin";

export async function requireStaff(
  request: Request,
  allowedRoles: StaffRole[] = ["editor", "verifier", "admin"],
) {
  const token = readSessionToken(request);
  if (!token) return null;
  const userResponse = await supabaseAuth("user", {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id: string; email?: string };
  const profiles = await adminRest<
    Array<{ id: string; display_name: string | null; role: string; is_active: boolean }>
  >(token, `profiles?select=id,display_name,role,is_active&id=eq.${user.id}&limit=1`);
  const profile = profiles[0];
  if (!profile?.is_active || !allowedRoles.includes(profile.role as StaffRole)) return null;
  return { token, user, profile };
}

export async function requireAdmin(request: Request) {
  return requireStaff(request, ["admin"]);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowedOrigins = new Set([new URL(request.url).origin]);
  const configured = process.env.APP_BASE_URL?.trim();
  if (configured) {
    try {
      allowedOrigins.add(new URL(configured).origin);
    } catch {
      // A malformed optional origin must not disable same-origin protection.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && (forwardedProto === "https" || forwardedProto === "http")) {
    try {
      allowedOrigins.add(new URL(`${forwardedProto}://${forwardedHost}`).origin);
    } catch {
      // Ignore malformed proxy headers and retain the other trusted origins.
    }
  }

  return allowedOrigins.has(origin);
}
