import { requireStaff, sameOrigin, adminRest } from "@/lib/supabase-admin";
import { cleanHttps, mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";

const SUPABASE_URL = process.env.SUPABASE_URL;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ENTITY_TYPES = new Set(["organizations", "brands", "products", "offers", "contents", "origin_claims"]);
const LINK_ROLES = new Set(["primary", "gallery", "logo", "hero", "evidence", "document"]);

type ReviewAsset = {
  id: string;
  purpose: string;
  original_storage_path: string;
  sanitized_storage_path: string | null;
  published_storage_path: string | null;
  original_filename: string;
  declared_mime: string;
  detected_mime: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  sha256_hex: string | null;
  technical_status: string;
  publication_status: string;
  technical_report: Record<string, unknown>;
  uploaded_by: string;
  created_at: string;
  events: Array<{ id: number; event_type: string; previous_state: string | null; next_state: string; actor_user_id: string | null; service_actor: string | null; created_at: string }>;
};

type LifecycleRow = { asset_id: string; lifecycle_state: string };
type ProfileRow = { id: string; display_name: string | null; role: string | null };

const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

async function signedPreview(token: string, asset: ReviewAsset) {
  if (asset.published_storage_path && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/public-media/${encodePath(asset.published_storage_path)}`;
  }
  const legacyUrl = cleanHttps(asset.technical_report?.legacy_public_url);
  if (legacyUrl) return legacyUrl;
  const bucket = asset.sanitized_storage_path ? "media-derivatives" : "media-quarantine";
  const path = asset.sanitized_storage_path || asset.original_storage_path;
  try {
    const response = await mediaStorageRequest(token, `object/sign/${bucket}/${encodePath(path)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!response.ok) return null;
    const result = await response.json() as { signedURL?: string; signedUrl?: string };
    const value = result.signedURL || result.signedUrl;
    return value && SUPABASE_URL ? new URL(value, `${SUPABASE_URL}/storage/v1/`).toString() : null;
  } catch {
    return null;
  }
}

const inFilter = (ids: string[]) => ids.length ? `in.(${ids.join(",")})` : "eq.00000000-0000-0000-0000-000000000000";

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const lifecycle = await adminRest<LifecycleRow[]>(admin.token,
      "media_asset_lifecycle?select=asset_id,lifecycle_state&lifecycle_state=in.(pending_technical_audit,pending_approval)"
    );
    const ids = lifecycle.map((row) => row.asset_id);
    if (!ids.length) return Response.json({ authenticated: true, role: admin.profile.role, assets: [], traceability_gap_count: 0 }, { headers: { "cache-control": "no-store" } });
    const assets = await adminRest<ReviewAsset[]>(admin.token,
      `media_assets?select=id,purpose,original_storage_path,sanitized_storage_path,published_storage_path,original_filename,declared_mime,detected_mime,byte_size,width,height,sha256_hex,technical_status,publication_status,technical_report,uploaded_by,created_at,events:media_ingestion_events(id,event_type,previous_state,next_state,actor_user_id,service_actor,created_at)&id=${inFilter(ids)}&order=created_at.asc`
    );
    const uploaderIds = [...new Set(assets.map((asset) => asset.uploaded_by))];
    const profiles = await adminRest<ProfileRow[]>(admin.token, `profiles?select=id,display_name,role&id=${inFilter(uploaderIds)}`);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const lifecycleById = new Map(lifecycle.map((row) => [row.asset_id, row.lifecycle_state]));
    const hydrated = await Promise.all(assets.map(async (asset) => ({
      ...asset,
      lifecycle_state: lifecycleById.get(asset.id) || "pending_approval",
      uploader: profileById.get(asset.uploaded_by) || { id: asset.uploaded_by, display_name: null, role: null },
      events: [...(asset.events || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 20),
      preview_url: await signedPreview(admin.token, asset),
    })));
    return Response.json({
      authenticated: true,
      role: admin.profile.role,
      assets: hydrated,
      traceability_gap_count: hydrated.filter((asset) => asset.events.length === 0).length,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("pending-asset-review-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false, reason: "cross_origin" }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false, reason: "unauthorized" }, { status: 401 });
  if (!["verifier", "admin"].includes(admin.profile.role)) return Response.json({ updated: false, reason: "reviewer_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as { assetId?: string; action?: string; payload?: Record<string, unknown> } | null;
  const assetId = String(body?.assetId || "");
  const action = String(body?.action || "");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  if (!UUID.test(assetId) || !["approve_assign", "reject_quarantine"].includes(action)) {
    return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  }
  if (action === "approve_assign") {
    const entityType = String(payload.entity_type || "");
    const entityId = String(payload.entity_id || "");
    const linkRole = String(payload.role || "");
    const altAr = String(payload.alt_ar || "").trim();
    if (!ENTITY_TYPES.has(entityType) || !UUID.test(entityId) || !LINK_ROLES.has(linkRole) || altAr.length < 2) {
      return Response.json({ updated: false, reason: "invalid_assignment" }, { status: 400 });
    }
  }
  try {
    const result = await mediaRpc<Record<string, unknown>>(admin.token, "admin_media_review_pending_asset", {
      p_asset_id: assetId,
      p_action: action,
      p_payload: payload,
    });
    return Response.json({ updated: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const known = [
      "reviewer_required", "asset_not_found", "asset_not_pending_review", "technical_evidence_incomplete",
      "duplicate_requires_review", "invalid_media_target", "invalid_assignment", "quarantine_reason_required",
      "active_record_links_block_quarantine",
    ].find((code) => message.includes(code));
    return Response.json({ updated: false, reason: known || mapMediaError(error) }, { status: known ? 409 : 502 });
  }
}
