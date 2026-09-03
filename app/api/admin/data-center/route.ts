import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { validateOrganizationCsv } from "@/lib/data-center";
import { isProductKind } from "@/lib/record-capability-types";
import { loadRecordCapability, serializeCapabilityAttributes } from "@/lib/record-capabilities";

type BatchRow = {
  id: string;
  batch_code: string;
  entity_type: string;
  source_label: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  created_at: string;
  imported_at: string | null;
};

async function loadDataCenter(token: string) {
  const [markets, batches, categories, organizations, products, brands, countries, filterDefinitions] = await Promise.all([
    adminRest<Array<{ id: string }>>(token, "markets?select=id&code=eq.IQ-BGD&limit=1"),
    adminRest<BatchRow[]>(token, "data_import_batches?select=id,batch_code,entity_type,source_label,status,total_rows,valid_rows,rejected_rows,created_at,imported_at&order=created_at.desc&limit=100"),
    adminRest<Array<{ id: string; code: string; name_ar: string; parent_id: string | null; navigation_parent_id: string | null; is_navigation_visible: boolean; catalog_family_id: string | null; catalog_filter_id: string | null; catalog_product_kind: string | null; comparison_group: string | null }>>(token, "categories?select=id,code,name_ar,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind,comparison_group&status=eq.published&order=sort_order.asc,code.asc&limit=500"),
    adminRest<Array<{ id: string; name_ar: string; status: string; organization_roles: Array<{ role_type: string }> }>>(token, "organizations?select=id,name_ar,status,organization_roles(role_type)&status=neq.archived&order=name_ar.asc&limit=1000"),
    adminRest<Array<{ id: string; name_ar: string; product_kind: string; status: string; brand_id: string | null; owner_organization_id: string | null; brands: { name_ar: string } | null; organizations: { name_ar: string } | null; product_categories: Array<{ category_id: string; categories: { code: string; name_ar: string } | null }>; product_attribute_values: Array<{ value_text: string | null; value_json: unknown; field_definitions: { code: string } | null }> }>>(token, "products?select=id,name_ar,product_kind,status,brand_id,owner_organization_id,brands(name_ar),organizations(name_ar),product_categories(category_id,categories(code,name_ar)),product_attribute_values(value_text,value_json,field_definitions(code))&status=neq.archived&order=name_ar.asc&limit=1000"),
    adminRest<Array<{ id: string; name_ar: string; brand_product_kinds: Array<{ product_kind: string }> }>>(token, "brands?select=id,name_ar,brand_product_kinds(product_kind)&status=eq.published&order=name_ar.asc&limit=500"),
    adminRest<Array<{ code: string; name_ar: string; coffee_regions: Array<{ id: string; name_ar: string }> }>>(token, "countries?select=code,name_ar,coffee_regions(id,name_ar)&status=eq.published&order=name_ar.asc"),
    adminRest<Array<{ category_id: string; sort_order: number; is_required_for_publish: boolean; field_definitions: Record<string, unknown> }>>(token, "filter_definitions?select=category_id,sort_order,is_required_for_publish,field_definitions(id,code,name_ar,data_type,allowed_values,unit_code)&status=eq.published&order=sort_order.asc"),
  ]);
  return { marketId: markets[0]?.id || null, batches, referenceData: { categories, organizations, products, brands: brands.map((brand) => ({ ...brand, product_kinds: [...new Set(brand.brand_product_kinds.map((row) => row.product_kind))] })), countries, filterDefinitions: filterDefinitions.map((rule) => ({ category_id: rule.category_id, sort_order: rule.sort_order, is_required_for_publish: rule.is_required_for_publish, ...rule.field_definitions })) } };
}

async function stageRows(
  token: string,
  userId: string,
  sourceLabel: string,
  rows: ReturnType<typeof validateOrganizationCsv>["rows"],
) {
  const dataCenter = await loadDataCenter(token);
  if (!dataCenter.marketId) throw new Error("market_missing");
  const validRows = rows.filter((row) => row.status !== "invalid").length;
  if (!validRows) return { created: false, reason: "no_valid_rows", rows } as const;
  const batchCode = `UI_ORG_${new Date().toISOString().slice(0, 10).replaceAll("-", "")}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const created = await adminRest<BatchRow[]>(token, "data_import_batches?select=*", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=representation" },
    body: JSON.stringify({
      batch_code: batchCode,
      entity_type: "organization",
      market_id: dataCenter.marketId,
      source_label: sourceLabel,
      status: "ready",
      total_rows: rows.length,
      valid_rows: validRows,
      rejected_rows: rows.length - validRows,
      created_by: userId,
    }),
  });
  const batch = created[0];
  if (!batch) throw new Error("batch_create_failed");
  await adminRest(token, "data_intake_rows", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify(rows.map((row) => ({
      batch_id: batch.id,
      source_row_number: row.sourceRowNumber,
      dedupe_key: row.status === "invalid" ? null : `${row.normalized.name_ar}|${row.normalized.address_ar}`.toLocaleLowerCase("ar-IQ"),
      raw_payload: row.raw,
      normalized_payload: row.normalized,
      validation_status: row.status,
      validation_messages: row.messages,
    }))),
  });
  await adminRest(token, "audit_events", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ actor_user_id: userId, action: "stage_organization_batch", entity_table: "data_import_batches", entity_id: batch.id, after_data: { batch_code: batchCode, total_rows: rows.length, valid_rows: validRows }, source: "data_center_ui" }),
  });
  return { created: true, batch, rows } as const;
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const batchId = new URL(request.url).searchParams.get("batchId");
    if (batchId && /^[0-9a-f-]{36}$/i.test(batchId)) {
      const [batch, rows] = await Promise.all([
        adminRest<BatchRow[]>(admin.token, `data_import_batches?select=id,batch_code,entity_type,source_label,status,total_rows,valid_rows,rejected_rows,created_at,imported_at&id=eq.${batchId}&limit=1`),
        adminRest<Array<Record<string, unknown>>>(admin.token, `data_intake_rows?select=id,source_row_number,normalized_payload,validation_status,validation_messages,target_table,target_id,reviewed_at&batch_id=eq.${batchId}&order=source_row_number.asc&limit=500`),
      ]);
      if (!batch[0]) return Response.json({ authenticated: true, reason: "not_found" }, { status: 404 });
      return Response.json({ authenticated: true, batch: batch[0], rows });
    }
    return Response.json({ authenticated: true, ...(await loadDataCenter(admin.token)) });
  } catch (error) {
    console.error("admin-data-center-get", error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false }, { status: 401 });
  const body = await request.json().catch(() => null) as null | {
    action?: string;
    csvText?: string;
    sourceLabel?: string;
    sourceConfirmed?: boolean;
    batchId?: string;
    name?: string;
    address?: string;
    contact?: string;
    marketCode?: string;
    roleType?: string;
    entityType?: string;
    payload?: Record<string, unknown>;
    attributes?: Array<{ fieldId?: string; value?: unknown }>;
    contractRevision?: string;
  };
  try {
    if (body?.action === "create_catalog_draft") {
      if (!body.sourceConfirmed || !["organization", "brand", "product", "content", "offer", "origin"].includes(body.entityType || "") || !body.payload) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      if (body.entityType === "brand") {
        const brandName = String(body.payload.name_ar || "").trim();
        const duplicateBrands = brandName ? await adminRest<Array<{ id: string; name_ar: string; status: string }>>(admin.token, `brands?select=id,name_ar,status&name_ar=eq.${encodeURIComponent(brandName)}&status=neq.archived&limit=1`) : [];
        if (duplicateBrands[0]) return Response.json({ updated: false, reason: "duplicate_brand", existing: duplicateBrands[0] }, { status: 409 });
        const created = await adminRest<Record<string, unknown>>(admin.token, "rpc/admin_create_brand_draft", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_payload: body.payload }) });
        return Response.json({ updated: true, created, ...(await loadDataCenter(admin.token)) });
      }
      if (body.entityType === "product") {
        const kind = String(body.payload.product_kind || "");
        if (!isProductKind(kind) || !body.contractRevision) return Response.json({ updated: false, reason: "capability_contract_required" }, { status: 409 });
        const contract = await loadRecordCapability(admin.token, kind, "create");
        if (contract.contract_revision !== body.contractRevision) return Response.json({ updated: false, reason: "contract_revision_stale", contract }, { status: 409 });
        const productName = String(body.payload.name_ar || "").trim();
        const duplicateProducts = productName ? await adminRest<Array<{ id: string; name_ar: string; status: string }>>(admin.token, `products?select=id,name_ar,status&name_ar=eq.${encodeURIComponent(productName)}&product_kind=eq.${encodeURIComponent(kind)}&status=neq.archived&limit=1`) : [];
        if (duplicateProducts[0]) return Response.json({ updated: false, reason: "duplicate_product", existing: duplicateProducts[0] }, { status: 409 });
        const categoryId = String(body.payload.category_id || "");
        const values = serializeCapabilityAttributes(contract, categoryId, body.attributes || []);
        const created = await adminRest<Record<string, unknown>>(admin.token, "rpc/admin_create_product_draft_v2", {
          method: "POST",
          headers: { "content-type": "application/json", prefer: "return=representation" },
          body: JSON.stringify({ p_payload: body.payload, p_values: values, p_contract_revision: body.contractRevision }),
        });
        return Response.json({ updated: true, created, ...(await loadDataCenter(admin.token)) });
      }
      if (body.entityType === "offer") {
        const productId = String(body.payload.product_id || "");
        const sellerId = String(body.payload.seller_organization_id || "");
        if (productId && sellerId) {
          const duplicateOffers = await adminRest<Array<{ id: string; status: string }>>(admin.token, `offers?select=id,status&product_id=eq.${productId}&seller_organization_id=eq.${sellerId}&status=neq.archived&limit=1`);
          if (duplicateOffers[0]) return Response.json({ updated: false, reason: "duplicate_offer", existing: duplicateOffers[0] }, { status: 409 });
        }
      }
      const created = await adminRest<Record<string, unknown>>(admin.token, "rpc/admin_create_catalog_draft", {
        method: "POST",
        headers: { "content-type": "application/json", prefer: "return=representation" },
        body: JSON.stringify({ p_entity_type: body.entityType, p_payload: body.payload }),
      });
      return Response.json({ updated: true, created: body.entityType === "origin" ? { ...created, status: "draft" } : created, ...(await loadDataCenter(admin.token)) });
    }
    if (body?.action === "stage_csv" || body?.action === "create_manual_draft") {
      const sourceLabel = String(body.sourceLabel || "").trim().slice(0, 180);
      if (body.marketCode !== "IQ-BGD") {
        return Response.json({ updated: false, reason: "market_not_enabled" }, { status: 400 });
      }
      if (!body.sourceConfirmed || sourceLabel.length < 3) {
        return Response.json({ updated: false, reason: "source_confirmation_required" }, { status: 400 });
      }
      const existingLocations = await adminRest<Array<{ address_ar: string; organizations: { name_ar: string } | null }>>(
        admin.token,
        "locations?select=address_ar,organizations(name_ar)&status=neq.archived&limit=5000",
      );
      const csvText = body.action === "stage_csv"
        ? String(body.csvText || "")
        : `اسم الجهة,نوع الجهة,عنوان,تواصل\n"${String(body.name || "").replaceAll('"', '""')}","${String(body.roleType || "cafe").replaceAll('"', '""')}","${String(body.address || "").replaceAll('"', '""')}","${String(body.contact || "").replaceAll('"', '""')}"`;
      const validated = validateOrganizationCsv(csvText, existingLocations.flatMap((row) => row.organizations ? [{ name_ar: row.organizations.name_ar, address_ar: row.address_ar }] : []));
      const staged = await stageRows(admin.token, admin.user.id, sourceLabel, validated.rows);
      if (!staged.created) return Response.json({ updated: false, reason: staged.reason, preview: staged.rows }, { status: 409 });
      if (body.action === "create_manual_draft") {
        const imported = await adminRest<Record<string, unknown>>(admin.token, "rpc/import_organization_intake_batch", {
          method: "POST",
          headers: { "content-type": "application/json", prefer: "return=representation" },
          body: JSON.stringify({ p_batch_id: staged.batch.id }),
        });
        return Response.json({ updated: true, imported, preview: staged.rows, ...(await loadDataCenter(admin.token)) });
      }
      return Response.json({ updated: true, batch: staged.batch, preview: staged.rows, ...(await loadDataCenter(admin.token)) });
    }
    if (body?.action === "import_batch") {
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) {
        return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      }
      const imported = await adminRest<Record<string, unknown>>(admin.token, "rpc/import_organization_intake_batch", {
        method: "POST",
        headers: { "content-type": "application/json", prefer: "return=representation" },
        body: JSON.stringify({ p_batch_id: body.batchId }),
      });
      return Response.json({ updated: true, imported, ...(await loadDataCenter(admin.token)) });
    }
    if (body?.action === "archive_batch" || body?.action === "restore_batch") {
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      const rows = await adminRest<BatchRow[]>(admin.token, `data_import_batches?select=*&id=eq.${body.batchId}&limit=1`);
      const batch = rows[0];
      if (!batch) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      const next = body.action === "archive_batch" ? "archived" : (batch.imported_at ? "imported" : "rejected");
      if (body.action === "archive_batch" && !["imported", "rejected"].includes(batch.status)) return Response.json({ updated: false, reason: "batch_not_complete" }, { status: 409 });
      await adminRest(admin.token, `data_import_batches?id=eq.${body.batchId}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ status: next }) });
      await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: body.action, entity_table: "data_import_batches", entity_id: body.batchId, before_data: { status: batch.status }, after_data: { status: next }, source: "data_center_ui" }) });
      return Response.json({ updated: true, ...(await loadDataCenter(admin.token)) });
    }
    if (body?.action === "delete_archived_batch") {
      if (admin.profile.role !== "admin") return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
      if (!body.batchId || !/^[0-9a-f-]{36}$/i.test(body.batchId)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      const rows = await adminRest<BatchRow[]>(admin.token, `data_import_batches?select=*&id=eq.${body.batchId}&limit=1`);
      const batch = rows[0];
      if (!batch || batch.status !== "archived") return Response.json({ updated: false, reason: "archived_batch_required" }, { status: 409 });
      const intakeRows = await adminRest<Array<{ id: string }>>(admin.token, `data_intake_rows?select=id&batch_id=eq.${body.batchId}&limit=1000`);
      await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "delete_archived_batch", entity_table: "data_import_batches", entity_id: body.batchId, before_data: { batch_code: batch.batch_code, status: batch.status, intake_rows: intakeRows.length }, after_data: { deleted: true }, source: "data_center_ui" }) });
      await adminRest(admin.token, `data_import_batches?id=eq.${body.batchId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
      return Response.json({ updated: true, deletedRows: intakeRows.length, ...(await loadDataCenter(admin.token)) });
    }
    return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("admin-data-center-post", message);
    if (message.includes("contract_revision_stale")) return Response.json({ updated: false, reason: "contract_revision_stale" }, { status: 409 });
    if (message.includes("category_kind_mismatch") || message.includes("brand_kind_mismatch") || message.includes("attribute_not_allowed") || message.includes("invalid_attribute_value")) {
      const reason = ["category_kind_mismatch","brand_kind_mismatch","attribute_not_allowed","invalid_attribute_value"].find((value) => message.includes(value)) || "invalid_input";
      return Response.json({ updated: false, reason }, { status: 400 });
    }
    const reason = /missing_headers|empty_csv|too_many_rows|invalid_size|unclosed_quote/.test(message) ? message : "upstream_error";
    return Response.json({ updated: false, reason }, { status: reason === "upstream_error" ? 502 : 400 });
  }
}
