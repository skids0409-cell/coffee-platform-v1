import { requireStaff, sameOrigin, adminRest } from "@/lib/supabase-admin";
import { mediaRpc } from "@/lib/media-vault";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;

type PreservationInventoryRow = {
  package_id: string;
  asset_id: string;
  package_type: "SIP" | "AIP" | "DIP";
  package_version: number;
  source_package_id: string | null;
  content_sha256_hex: string;
  byte_size: number;
  designated_community: string;
  created_at: string;
  lifecycle_state: string;
  canonical_phase: string;
  latest_fixity_outcome: string | null;
  latest_fixity_at: string | null;
};

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const packages = await adminRest<PreservationInventoryRow[]>(admin.token,
      "oais_preservation_inventory?select=package_id,asset_id,package_type,package_version,source_package_id,content_sha256_hex,byte_size,designated_community,created_at,lifecycle_state,canonical_phase,latest_fixity_outcome,latest_fixity_at&order=created_at.desc"
    );
    const aipCount = packages.filter((row) => row.package_type === "AIP").length;
    const dipCount = packages.filter((row) => row.package_type === "DIP").length;
    const failedFixity = packages.filter((row) => row.latest_fixity_outcome === "failure").length;
    return Response.json({ authenticated: true, role: admin.profile.role, packages, summary: { aipCount, dipCount, failedFixity } }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("preservation-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false, reason: "cross_origin" }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false, reason: "unauthorized" }, { status: 401 });
  if (!["verifier", "admin"].includes(admin.profile.role)) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    action?: string;
    assetId?: string;
    packageId?: string;
    observedSha256?: string;
    note?: string;
    purpose?: string;
    designatedCommunity?: string;
    representationInformation?: Record<string, unknown>;
    preservationContext?: Record<string, unknown>;
  } | null;
  const action = String(body?.action || "");

  try {
    if (action === "create_aip") {
      const assetId = String(body?.assetId || "");
      if (!UUID.test(assetId)) return Response.json({ updated: false, reason: "invalid_asset_id" }, { status: 400 });
      const result = await mediaRpc<Record<string, unknown>>(admin.token, "admin_create_oais_aip", {
        p_asset_id: assetId,
        p_representation_information: body?.representationInformation || {},
        p_preservation_context: body?.preservationContext || {},
      });
      return Response.json({ updated: true, result });
    }

    if (action === "verify_fixity") {
      const packageId = String(body?.packageId || "");
      const observedSha256 = String(body?.observedSha256 || "").trim().toLowerCase();
      if (!UUID.test(packageId) || !SHA256.test(observedSha256)) return Response.json({ updated: false, reason: "invalid_fixity_input" }, { status: 400 });
      const result = await mediaRpc<Record<string, unknown>>(admin.token, "admin_verify_oais_fixity", {
        p_package_id: packageId,
        p_observed_sha256_hex: observedSha256,
        p_note: String(body?.note || "").trim() || null,
      });
      return Response.json({ updated: true, result });
    }

    if (action === "create_dip") {
      const packageId = String(body?.packageId || "");
      const purpose = String(body?.purpose || "").trim();
      const designatedCommunity = String(body?.designatedCommunity || "coffee-platform-governed-users").trim();
      if (!UUID.test(packageId) || purpose.length < 5) return Response.json({ updated: false, reason: "invalid_dissemination_input" }, { status: 400 });
      const result = await mediaRpc<Record<string, unknown>>(admin.token, "admin_create_oais_dip", {
        p_aip_package_id: packageId,
        p_purpose: purpose,
        p_designated_community: designatedCommunity || "coffee-platform-governed-users",
      });
      return Response.json({ updated: true, result });
    }

    return Response.json({ updated: false, reason: "invalid_action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const known = [
      "verifier_required", "asset_not_found", "asset_fixity_incomplete", "asset_disposition_in_progress",
      "preservation_package_not_found", "invalid_sha256", "aip_package_not_found", "dissemination_purpose_required",
      "immutable_preservation_history",
    ].find((code) => message.includes(code));
    return Response.json({ updated: false, reason: known || "upstream_error" }, { status: known ? 409 : 502 });
  }
}
