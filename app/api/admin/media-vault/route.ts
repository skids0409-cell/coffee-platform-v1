import { requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { cleanHttps, mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";
import { adminRest } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.SUPABASE_URL;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["quarantine", "restore", "unlink", "update_metadata", "request_purge", "approve_purge", "reject_purge"]);

type LifecycleRow = {
  asset_id: string;
  lifecycle_state: string;
  quarantine_started_at: string | null;
  retention_expires_at: string | null;
  retention_days_remaining: number | null;
  purge_request_id: string | null;
  purge_request_status: string | null;
  public_eligible: boolean;
};

type VaultLink = {
  id: string;
  entity_type: string;
  entity_id: string;
  role: string;
  is_primary: boolean;
  sort_order: number;
  alt_ar: string;
  alt_en: string | null;
  caption_ar: string | null;
  caption_en: string | null;
  link_status: string;
  linked_at: string;
  target_label?: string;
};

type VaultAsset = {
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
  pixel_count: number | null;
  page_count: number | null;
  sha256_hex: string | null;
  duplicate_of_asset_id: string | null;
  technical_status: string;
  publication_status: string;
  rejection_codes: string[];
  technical_report: Record<string, unknown>;
  legal_hold: boolean;
  uploaded_by: string;
  validated_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  restricted_at: string | null;
  created_at: string;
  updated_at: string;
  links: VaultLink[];
  rights: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  purge_requests: Array<Record<string, unknown>>;
  preview_url?: string | null;
};

const encodePath = (value: string) => value.split("/").map(encodeURIComponent).join("/");

async function signedPreview(token: string, asset: VaultAsset) {
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

async function targetLabels(token: string, links: VaultLink[]) {
  const ids = (entity: string) => [...new Set(links.filter((link) => link.entity_type === entity).map((link) => link.entity_id))];
  const [products, offers, organizations, brands] = await Promise.all([
    adminRest<Array<{ id: string; name_ar: string }>>(token, `products?select=id,name_ar&id=${inFilter(ids("products"))}`),
    adminRest<Array<{ id: string; products: { name_ar: string } | null; organizations: { name_ar: string } | null }>>(token, `offers?select=id,products(name_ar),organizations(name_ar)&id=${inFilter(ids("offers"))}`),
    adminRest<Array<{ id: string; name_ar: string }>>(token, `organizations?select=id,name_ar&id=${inFilter(ids("organizations"))}`),
    adminRest<Array<{ id: string; name_ar: string }>>(token, `brands?select=id,name_ar&id=${inFilter(ids("brands"))}`),
  ]);
  return new Map<string, string>([
    ...products.map((row) => [`products:${row.id}`, row.name_ar] as const),
    ...offers.map((row) => [`offers:${row.id}`, `${row.products?.name_ar || "عرض"}${row.organizations?.name_ar ? ` — ${row.organizations.name_ar}` : ""}`] as const),
    ...organizations.map((row) => [`organizations:${row.id}`, row.name_ar] as const),
    ...brands.map((row) => [`brands:${row.id}`, row.name_ar] as const),
  ]);
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const [assets,lifecycleRows] = await Promise.all([
      adminRest<VaultAsset[]>(admin.token,
        "media_assets?select=id,purpose,original_storage_path,sanitized_storage_path,published_storage_path,original_filename,declared_mime,detected_mime,byte_size,width,height,pixel_count,page_count,sha256_hex,duplicate_of_asset_id,technical_status,publication_status,rejection_codes,technical_report,legal_hold,uploaded_by,validated_at,approved_at,published_at,restricted_at,quarantine_started_at,retention_expires_at,created_at,updated_at,links:media_asset_links(id,entity_type,entity_id,role,is_primary,sort_order,alt_ar,alt_en,caption_ar,caption_en,link_status,linked_at),rights:media_rights_assertions(id,rights_basis,copyright_owner,source_url,license_url,territory,expires_at,commercial_use_allowed,modification_allowed,attestation_version,attested_at,review_status,review_note,created_at),events:media_ingestion_events(id,event_type,previous_state,next_state,actor_user_id,service_actor,policy_version,technical_report,created_at),purge_requests:media_purge_requests(id,reason,status,requested_by,requested_at,reviewed_at,review_note,execution_started_at)&order=created_at.desc&limit=500"
      ),
      adminRest<LifecycleRow[]>(admin.token,"media_asset_lifecycle?select=asset_id,lifecycle_state,quarantine_started_at,retention_expires_at,retention_days_remaining,purge_request_id,purge_request_status,public_eligible"),
    ]);
    const lifecycleByAsset = new Map(lifecycleRows.map((row)=>[row.asset_id,row]));
    const allLinks = assets.flatMap((asset) => asset.links || []);
    const labels = await targetLabels(admin.token, allLinks);
    const hydrated = await Promise.all(assets.map(async (asset) => ({
      ...asset,
      ...lifecycleByAsset.get(asset.id),
      links: (asset.links || []).map((link) => ({
        ...link,
        target_label: labels.get(`${link.entity_type}:${link.entity_id}`) || `${link.entity_type} · ${link.entity_id.slice(0, 8)}`,
      })),
      rights: asset.rights || [],
      events: (asset.events || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 30),
      purge_requests: asset.purge_requests || [],
      preview_url: await signedPreview(admin.token, asset),
    })));
    const activeLinks = (asset: VaultAsset) => (asset.links || []).filter((link) => ["active", "pending"].includes(link.link_status));
    const latestRights = (asset: VaultAsset) => (asset.rights || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    return Response.json({
      authenticated: true,
      role: admin.profile.role,
      assets: hydrated,
      summary: {
        total: hydrated.length,
        quarantined: hydrated.filter((asset) => ["quarantined", "restricted"].includes(asset.publication_status)).length,
        orphans: hydrated.filter((asset) => activeLinks(asset).length === 0).length,
        duplicates: hydrated.filter((asset) => asset.technical_status === "duplicate" || Boolean(asset.duplicate_of_asset_id)).length,
        missingRights: hydrated.filter((asset) => !latestRights(asset)).length,
        technicalReview: hydrated.filter((asset) => asset.technical_status === "validating").length,
        legalHolds: hydrated.filter((asset) => asset.legal_hold).length,
        active: hydrated.filter((asset) => asset.lifecycle_state === "active").length,
        retention: hydrated.filter((asset) => asset.lifecycle_state === "quarantine_retention").length,
        disposalEligible: hydrated.filter((asset) => asset.lifecycle_state === "disposal_eligible").length,
        disposalQueue: hydrated.filter((asset) => ["disposal_requested","disposal_approved","disposal_executing"].includes(String(asset.lifecycle_state))).length,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("admin-media-vault-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false, reason: "cross_origin" }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { action?: string; assetIds?: string[]; payload?: Record<string, unknown> } | null;
  const action = String(body?.action || "");
  const assetIds = Array.isArray(body?.assetIds) ? [...new Set(body.assetIds.map(String))] : [];
  if (!ACTIONS.has(action) || assetIds.length < 1 || assetIds.length > 100 || assetIds.some((id) => !UUID.test(id))) {
    return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  }
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  try {
    const result = await mediaRpc<Record<string, unknown>>(admin.token, "admin_media_vault_action", {
      p_action: action,
      p_asset_ids: assetIds,
      p_payload: payload,
    });
    return Response.json({ updated: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const known = ["admin_required", "reviewer_required", "asset_not_found", "asset_not_quarantined", "metadata_required", "invalid_alt_text", "quarantine_reason_required", "purge_reason_required", "legal_hold_blocks_purge", "legal_hold_blocks_restore", "quarantine_required_before_purge", "retention_period_active", "active_record_links_block_quarantine", "active_links_block_purge", "dependent_duplicates_block_purge", "pending_purge_request_missing", "asset_not_disposal_eligible", "review_note_required"]
      .find((code) => message.includes(code));
    return Response.json({ updated: false, reason: known || mapMediaError(error) }, { status: known?.includes("required") || known?.includes("blocked") || known === "asset_not_quarantined" ? 409 : 502 });
  }
}
