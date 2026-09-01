import { adminRest, requireAdmin, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import {
  TaxonomyInputError,
  categoryPayload,
  fieldPayload,
  filterPayload,
  requiredId,
  requiredTimestamp,
  transitionPayload,
} from "@/lib/taxonomy-admin";

const jsonHeaders = {
  "cache-control": "no-store, max-age=0, must-revalidate",
  "cdn-cache-control": "no-store",
  "vary": "cookie",
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (error instanceof TaxonomyInputError)
    return Response.json({ updated: false, reason: error.reason }, { status: 422, headers: jsonHeaders });
  if (message.includes("taxonomy_version_conflict"))
    return Response.json({ updated: false, reason: "taxonomy_version_conflict" }, { status: 409, headers: jsonHeaders });
  if (message.includes("admin_required"))
    return Response.json({ updated: false, reason: "admin_required" }, { status: 403, headers: jsonHeaders });
  if (/invalid_|cycle|deferred|immutable|required_|published_|block_/.test(message))
    return Response.json({ updated: false, reason: message.slice(0, 240) }, { status: 422, headers: jsonHeaders });
  console.error("taxonomy-admin", message.slice(0, 500));
  return Response.json({ updated: false, reason: "upstream_error" }, { status: 502, headers: jsonHeaders });
}

async function bodyWithinLimit(request: Request) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > 65_536) throw new TaxonomyInputError("payload_too_large");
  const raw = await request.text();
  if (raw.length > 65_536) throw new TaxonomyInputError("payload_too_large");
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new TaxonomyInputError("invalid_json");
  }
}

async function snapshot(token: string) {
  const [categories, fields, filters] = await Promise.all([
    adminRest<Array<Record<string, unknown>>>(token,
      "categories?select=id,code,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind,slug,name_ar,name_en,description_ar,description_en,sort_order,comparison_group,phase,is_filterable,status,created_at,updated_at&order=sort_order.asc,code.asc&limit=500"),
    adminRest<Array<Record<string, unknown>>>(token,
      "field_definitions?select=id,code,name_ar,name_en,data_type,unit_code,allowed_values,validation_rules,missing_value_policy,is_searchable,is_comparable,is_recommendation_input,is_multi_value,status,created_at,updated_at&order=code.asc&limit=500"),
    adminRest<Array<Record<string, unknown>>>(token,
      "filter_definitions?select=id,category_id,field_definition_id,operator,sort_order,is_visible,is_required_for_publish,status,created_at,updated_at&order=category_id.asc,sort_order.asc&limit=2000"),
  ]);
  return {
    authenticated: true,
    schemaVersion: "step2-034-equipment-navigation",
    serverTime: new Date().toISOString(),
    categories,
    fields,
    filters,
    counts: {
      categories: categories.length,
      fields: fields.length,
      filters: filters.length,
    },
  };
}

export async function GET(request: Request) {
  const view = new URL(request.url).searchParams.get("view");
  if (view === "tree") {
    const staff = await requireStaff(request).catch(() => null);
    if (!staff)
      return Response.json({ authenticated: false, reason: "staff_required" }, { status: 401, headers: jsonHeaders });
    try {
      const categories = await adminRest<Array<Record<string, unknown>>>(staff.token,
        "categories?select=id,code,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind,name_ar,name_en,sort_order,status&order=sort_order.asc,code.asc&limit=500");
      return Response.json({ authenticated: true, schemaVersion: "step2-034-navigation-v1", categories }, { headers: jsonHeaders });
    } catch (error) {
      return errorResponse(error);
    }
  }
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin)
    return Response.json({ authenticated: false, reason: "admin_required" }, { status: 401, headers: jsonHeaders });
  try {
    return Response.json(await snapshot(admin.token), { headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ updated: false, reason: "origin_rejected" }, { status: 403, headers: jsonHeaders });
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin)
    return Response.json({ updated: false, reason: "admin_required" }, { status: 403, headers: jsonHeaders });
  try {
    const body = await bodyWithinLimit(request);
    const action = String(body.action || "");
    let result: unknown;
    if (action === "create_category") {
      result = await adminRest(admin.token, "rpc/admin_upsert_category", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_category_id: null,
          p_payload: categoryPayload(body.payload),
          p_expected_updated_at: null,
        }),
      });
    } else if (action === "create_field") {
      result = await adminRest(admin.token, "rpc/admin_upsert_field_definition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_field_definition_id: null,
          p_payload: fieldPayload(body.payload),
          p_expected_updated_at: null,
        }),
      });
    } else if (action === "replace_filters" || action === "validate_change") {
      const categoryId = requiredId(body.categoryId, "invalid_category_id");
      const filters = filterPayload(body.filters);
      const path = action === "replace_filters"
        ? "rpc/admin_replace_category_filters"
        : "rpc/admin_validate_taxonomy_change";
      const payload = action === "replace_filters"
        ? {
            p_category_id: categoryId,
            p_filters: filters,
            p_expected_updated_at: requiredTimestamp(body.expectedUpdatedAt),
          }
        : {
            p_operation: "replace_category_filters",
            p_payload: { category_id: categoryId, filters },
          };
      result = await adminRest(admin.token, path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      throw new TaxonomyInputError("unsupported_action");
    }
    return Response.json({ updated: action !== "validate_change", result, ...(await snapshot(admin.token)) }, { headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ updated: false, reason: "origin_rejected" }, { status: 403, headers: jsonHeaders });
  const admin = await requireAdmin(request).catch(() => null);
  if (!admin)
    return Response.json({ updated: false, reason: "admin_required" }, { status: 403, headers: jsonHeaders });
  try {
    const body = await bodyWithinLimit(request);
    const action = String(body.action || "");
    let result: unknown;
    if (action === "update_category") {
      result = await adminRest(admin.token, "rpc/admin_upsert_category", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_category_id: requiredId(body.id),
          p_payload: categoryPayload(body.payload),
          p_expected_updated_at: requiredTimestamp(body.expectedUpdatedAt),
        }),
      });
    } else if (action === "update_field") {
      result = await adminRest(admin.token, "rpc/admin_upsert_field_definition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_field_definition_id: requiredId(body.id),
          p_payload: fieldPayload(body.payload),
          p_expected_updated_at: requiredTimestamp(body.expectedUpdatedAt),
        }),
      });
    } else if (action === "transition_status") {
      const transition = transitionPayload(body);
      result = await adminRest(admin.token, "rpc/admin_transition_taxonomy_status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_entity: transition.entity,
          p_id: transition.id,
          p_status: transition.status,
          p_reason: transition.reason,
          p_expected_updated_at: transition.expectedUpdatedAt,
        }),
      });
    } else {
      throw new TaxonomyInputError("unsupported_action");
    }
    return Response.json({ updated: true, result, ...(await snapshot(admin.token)) }, { headers: jsonHeaders });
  } catch (error) {
    return errorResponse(error);
  }
}
