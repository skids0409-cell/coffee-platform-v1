import { adminRest } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

export const MEDIA_ATTESTATION_VERSION = "media-terms-2026-08-v1";
export const MEDIA_ENTITIES = new Set(["organizations", "brands", "products", "offers", "contents", "origin_claims"]);
export const MEDIA_ROLES = new Set(["primary", "gallery", "logo", "hero", "evidence", "document"]);
export const RIGHTS_BASES = new Set(["creator_owned", "explicit_written_permission", "exclusive_license", "nonexclusive_license", "manufacturer_press_kit", "open_license", "public_domain"]);

export function purposeForEntity(entity: string) {
  return ({ products: "master_product", offers: "vendor_offer", organizations: "organization_profile", brands: "brand_identity", contents: "editorial", origin_claims: "origin_evidence" } as Record<string,string>)[entity] || "";
}

export async function mediaStorageRequest(token: string, path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("not_configured");
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

export async function mediaRpc<T>(token: string, fn: string, payload: Record<string,unknown>): Promise<T> {
  return adminRest<T>(token, `rpc/${fn}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function cleanHttps(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;
  try { const url = new URL(text); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}

export function sanitizeFilename(value: unknown) {
  return String(value || "asset").replace(/[\u0000-\u001f\u007f]/g, "").replace(/[\\/]/g, "_").trim().slice(0,255) || "asset";
}

export function mapMediaError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  for (const code of ["staff_required","reviewer_required","invalid_media_target","attestation_required","rights_scope_insufficient","unsupported_declared_mime","invalid_media_role","intent_not_found","intent_not_active","quarantine_object_missing","asset_not_found","asset_not_publishable","rights_assertion_missing","rights_expired","publication_not_prepared","published_object_missing"]) {
    if (message.includes(code)) return code;
  }
  return "upstream_error";
}
