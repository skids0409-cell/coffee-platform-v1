import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { isProductKind } from "@/lib/record-capability-types";
import { loadRecordCapability, serializeCapabilityAttributes } from "@/lib/record-capabilities";

const entities = ["organizations", "brands", "products", "offers", "contents", "origin_claims"] as const;
type Entity = (typeof entities)[number];

const isEntity = (value: string): value is Entity => entities.includes(value as Entity);
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);
const validEventId = (value: string) => /^\d+$/.test(value);
const clean = (value: unknown, max = 4000) => String(value ?? "").trim().slice(0, max);

async function sourceLinks(token: string, entity: Entity, id: string) {
  return await adminRest<Array<Record<string, unknown>>>(token, `entity_source_links?select=id,claim_scope,is_primary,source_records(id,title,source_type,url,publisher,accessed_at,evidence_excerpt)&entity_table=eq.${entity}&entity_id=eq.${id}&order=is_primary.desc`);
}

async function loadRecord(token: string, entity: Entity, id: string) {
  let record: Record<string, unknown> | undefined;
  let fieldDefinitions: Array<Record<string, unknown>> = [];
  let references: Record<string, unknown> = {};
  if (entity === "organizations") {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `organizations?select=*,organization_roles(role_type,is_primary),locations(id,name_ar,address_ar,district_ar,phone,status)&id=eq.${id}&limit=1`))[0];
  } else if (entity === "brands") {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `brands?select=*,brand_product_kinds(product_kind)&id=eq.${id}&limit=1`))[0];
    references = { organizations: await adminRest<Array<Record<string, unknown>>>(token, "organizations?select=id,name_ar&status=neq.archived&order=name_ar.asc&limit=1000") };
  } else if (entity === "products") {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `products?select=*,product_categories(category_id,is_primary,categories(code,name_ar)),product_attribute_values(id,field_definition_id,value_text,value_integer,value_decimal,value_boolean,value_date,value_json,unit_code,source_record_id,field_definitions(code,name_ar,data_type,allowed_values,unit_code))&id=eq.${id}&limit=1`))[0];
    const productCategories = (record?.product_categories || []) as Array<{ category_id: string; is_primary: boolean }>;
    const primaryCategoryId = productCategories.find((category) => category.is_primary)?.category_id || productCategories[0]?.category_id;
    if (primaryCategoryId) {
      const rules = await adminRest<Array<{ sort_order: number; is_required_for_publish: boolean; field_definitions: Record<string, unknown> }>>(token, `filter_definitions?select=sort_order,is_required_for_publish,field_definitions(id,code,name_ar,data_type,allowed_values,unit_code,missing_value_policy)&category_id=eq.${primaryCategoryId}&status=eq.published&order=sort_order.asc`);
      fieldDefinitions = rules.map((rule) => ({ ...rule.field_definitions, sort_order: rule.sort_order, is_required_for_publish: rule.is_required_for_publish }));
    }
    const [categories, brands, organizations, filterDefinitions] = await Promise.all([
      adminRest<Array<Record<string, unknown>>>(token, "categories?select=id,code,name_ar,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind,comparison_group&status=eq.published&order=sort_order.asc,code.asc&limit=500"),
      adminRest<Array<Record<string, unknown>>>(token, "brands?select=id,name_ar,brand_product_kinds(product_kind)&status=eq.published&order=name_ar.asc&limit=500"),
      adminRest<Array<Record<string, unknown>>>(token, "organizations?select=id,name_ar,organization_roles(role_type)&status=neq.archived&order=name_ar.asc&limit=1000"),
      adminRest<Array<{ category_id: string; sort_order: number; is_required_for_publish: boolean; field_definitions: Record<string, unknown> }>>(token, "filter_definitions?select=category_id,sort_order,is_required_for_publish,field_definitions(id,code,name_ar,data_type,allowed_values,unit_code)&status=eq.published&order=sort_order.asc"),
    ]);
    references = { categories, brands: brands.map((brand) => ({ ...brand, product_kinds: [...new Set(((brand.brand_product_kinds || []) as Array<{ product_kind: string }>).map((row) => row.product_kind))] })), organizations, filterDefinitions: filterDefinitions.map((rule) => ({ category_id: rule.category_id, sort_order: rule.sort_order, is_required_for_publish: rule.is_required_for_publish, ...rule.field_definitions })) };
  } else if (entity === "offers") {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `offers?select=*,products(id,name_ar),organizations(id,name_ar),source_records(id,title,url,publisher)&id=eq.${id}&limit=1`))[0];
  } else if (entity === "contents") {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `contents?select=*&id=eq.${id}&limit=1`))[0];
  } else {
    record = (await adminRest<Array<Record<string, unknown>>>(token, `origin_claims?select=*,products(id,name_ar),countries(code,name_ar),coffee_regions(id,name_ar),source_records(id,title,source_type,url,publisher,accessed_at,evidence_excerpt)&id=eq.${id}&limit=1`))[0];
  }
  if (!record) return null;
  const [qualityIssues, media, history] = await Promise.all([
    adminRest<Array<Record<string, unknown>>>(token, `data_quality_issues?select=id,severity,message_ar,field_code,status,resolution_note&entity_table=eq.${entity}&entity_id=eq.${id}&status=eq.open&order=severity.asc`),
    adminRest<Array<Record<string, unknown>>>(token, `entity_media?select=id,url,alt_ar,rights_note,is_primary,sort_order,created_at&entity_table=eq.${entity}&entity_id=eq.${id}&order=is_primary.desc,sort_order.asc,created_at.asc`),
    adminRest<Array<Record<string, unknown>>>(token, `audit_events?select=id,action,before_data,after_data,created_at,actor_user_id&entity_table=eq.${entity}&entity_id=eq.${id}&order=created_at.desc&limit=30`),
  ]);
  return { record, sources: entity === "origin_claims" ? [{ id: `origin-${id}`, is_primary: true, source_records: (record as Record<string, unknown>).source_records }] : await sourceLinks(token, entity, id), fieldDefinitions, references, qualityIssues, media, history };
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity") || "";
  const id = url.searchParams.get("id") || "";
  if (!isEntity(entity) || !validId(id)) return Response.json({ reason: "invalid_input" }, { status: 400 });
  try {
    const data = await loadRecord(admin.token, entity, id);
    return data ? Response.json({ authenticated: true, entity, ...data }) : Response.json({ reason: "not_found" }, { status: 404 });
  } catch (error) {
    console.error("admin-record-get", error);
    return Response.json({ reason: "upstream_error" }, { status: 502 });
  }
}

function normalizeFields(entity: Entity, fields: Record<string, unknown>) {
  if (entity === "organizations") return { name_ar: clean(fields.name_ar, 160), name_en: clean(fields.name_en, 160) || null, description_ar: clean(fields.description_ar) || null, website_url: clean(fields.website_url, 500) || null, phone: clean(fields.phone, 80) || null, email: clean(fields.email, 200) || null, address_ar: clean(fields.address_ar, 400), district_ar: clean(fields.district_ar, 160) || null, location_phone: clean(fields.location_phone, 80) || null };
  if (entity === "brands") return { name_ar: clean(fields.name_ar, 160), name_en: clean(fields.name_en, 160) || null, website_url: clean(fields.website_url, 500) || null, manufacturer_organization_id: validId(clean(fields.manufacturer_organization_id)) ? clean(fields.manufacturer_organization_id) : null, product_kind: clean(fields.product_kind, 40) };
  if (entity === "offers") return { price: Number(fields.price), currency_code: clean(fields.currency_code, 3) || "IQD", availability: clean(fields.availability, 30), external_url: clean(fields.external_url, 1000), observed_at: clean(fields.observed_at, 40) || new Date().toISOString() };
  if (entity === "contents") return { title_ar: clean(fields.title_ar, 200), title_en: clean(fields.title_en, 200) || null, excerpt_ar: clean(fields.excerpt_ar, 1000) || null, body_ar: clean(fields.body_ar, 20000) };
  if (entity === "origin_claims") return { farm_or_producer_name: clean(fields.farm_or_producer_name, 300) || null, lot_reference: clean(fields.lot_reference, 160) || null, process_code: clean(fields.process_code, 120) || null, variety_codes: clean(fields.variety_codes, 500).split(/[،,]/).map((value) => value.trim()).filter(Boolean), harvest_label: clean(fields.harvest_label, 120) || null };
  return fields;
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false }, { status: 401 });
  const body = await request.json().catch(() => null) as null | { entity?: string; id?: string; fields?: Record<string, unknown>; attributes?: Array<{ fieldId?: string; value?: unknown }>; issueUpdates?: Array<{ id?: string; status?: string; resolutionNote?: string }>; contractRevision?: string };
  if (!body?.entity || !isEntity(body.entity) || !body.id || !validId(body.id) || !body.fields) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  const entity = body.entity;
  const beforeData = await loadRecord(admin.token, entity, body.id);
  if (!beforeData) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
  try {
    if (entity === "products") {
      const productKind = String(beforeData.record.product_kind || "");
      if (!isProductKind(productKind) || !body.contractRevision) return Response.json({ updated: false, reason: "capability_contract_required" }, { status: 409 });
      const contract = await loadRecordCapability(admin.token, productKind, "edit", body.id);
      if (contract.contract_revision !== body.contractRevision) return Response.json({ updated: false, reason: "contract_revision_stale", contract }, { status: 409 });
      if (contract.record_state === "legacy_conflict") return Response.json({ updated: false, reason: "reclassification_required", contract }, { status: 409 });
      const categoryId = clean(body.fields.category_id);
      const existingSources = new Map(((beforeData.record.product_attribute_values || []) as Array<{ field_definition_id: string; source_record_id?: string | null }>).map((attribute) => [attribute.field_definition_id, attribute.source_record_id || null]));
      const values = serializeCapabilityAttributes(contract, categoryId, body.attributes || []).map((value) => ({ ...value, source_record_id: existingSources.get(String(value.field_definition_id)) || null }));
      await adminRest(admin.token, "rpc/admin_update_product_v2", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_product_id: body.id, p_fields: body.fields, p_values: values, p_issue_updates: body.issueUpdates || [], p_contract_revision: body.contractRevision }) });
    } else {
      await adminRest(admin.token, "rpc/admin_update_governed_record", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_entity: entity, p_entity_id: body.id, p_fields: normalizeFields(entity, body.fields), p_issue_updates: body.issueUpdates || [] }) });
    }
    return Response.json({ updated: true, ...(await loadRecord(admin.token, entity, body.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("admin-record-patch", message);
    if (message.includes("contract_revision_stale")) return Response.json({ updated: false, reason: "contract_revision_stale" }, { status: 409 });
    const known = ["category_kind_mismatch","brand_kind_mismatch","attribute_not_allowed","invalid_attribute_value","product_kind_immutable","invalid_input","record_not_found","unsupported_governed_entity"];
    const reason = known.find((value) => message.includes(value));
    return Response.json({ updated: false, reason: reason || "upstream_error" }, { status: reason ? 400 : 502 });
  }
}

// Legacy contract marker: restore_record_revision now executes only through the governed RPC boundary.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ restored: false }, { status: 403 });
  const staff = await requireStaff(request, ["verifier", "admin"]).catch(() => null);
  if (!staff) return Response.json({ restored: false, reason: "verifier_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as null | { action?: string; entity?: string; id?: string; eventId?: string | number };
  const eventId = String(body?.eventId ?? "");
  if (body?.action !== "restore_revision" || !body.entity || !isEntity(body.entity) || !body.id || !validId(body.id) || !validEventId(eventId)) return Response.json({ restored: false, reason: "invalid_input" }, { status: 400 });
  try {
    await adminRest(staff.token, "rpc/admin_restore_governed_record_revision", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ p_entity: body.entity, p_entity_id: body.id, p_event_id: Number(eventId) }) });
    return Response.json({ restored: true, ...(await loadRecord(staff.token, body.entity, body.id)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("admin-record-restore", message);
    const known = ["revision_not_found","record_not_found","unsupported_governed_entity","verifier_required"];
    const reason = known.find((value) => message.includes(value));
    return Response.json({ restored: false, reason: reason || "upstream_error" }, { status: reason ? 400 : 502 });
  }
}
