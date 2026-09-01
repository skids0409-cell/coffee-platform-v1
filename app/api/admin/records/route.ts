import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import {
  isContractRevisionError,
  ProductAttributeError,
  serializeProductAttributes,
  type ProductAttributeInput,
  type ProductFieldDefinition,
} from "@/lib/admin-product-contract";

const entities = ["organizations", "brands", "products", "offers", "contents", "origin_claims"] as const;
type Entity = (typeof entities)[number];

const isEntity = (value: string): value is Entity => entities.includes(value as Entity);
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);
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
  const [qualityIssues, media, history, recordContractRevision] = await Promise.all([
    adminRest<Array<Record<string, unknown>>>(token, `data_quality_issues?select=id,severity,message_ar,field_code,status,resolution_note&entity_table=eq.${entity}&entity_id=eq.${id}&status=eq.open&order=severity.asc`),
    adminRest<Array<Record<string, unknown>>>(token, `entity_media?select=id,url,alt_ar,rights_note,is_primary,sort_order,created_at&entity_table=eq.${entity}&entity_id=eq.${id}&order=is_primary.desc,sort_order.asc,created_at.asc`),
    adminRest<Array<Record<string, unknown>>>(token, `audit_events?select=id,action,before_data,after_data,created_at,actor_user_id&entity_table=eq.${entity}&entity_id=eq.${id}&order=created_at.desc&limit=30`),
    entity === "products" ? adminRest<string>(token, "rpc/admin_record_contract_revision", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }) : Promise.resolve(null),
  ]);
  return { record, sources: entity === "origin_claims" ? [{ id: `origin-${id}`, is_primary: true, source_records: (record as Record<string, unknown>).source_records }] : await sourceLinks(token, entity, id), fieldDefinitions, references, qualityIssues, media, history, recordContractRevision };
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

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false }, { status: 401 });
  const body = await request.json().catch(() => null) as null | { entity?: string; id?: string; fields?: Record<string, unknown>; attributes?: ProductAttributeInput[]; issueUpdates?: Array<{ id?: string; status?: string; resolutionNote?: string }>; contractRevision?: string };
  if (!body?.entity || !isEntity(body.entity) || !body.id || !validId(body.id) || !body.fields) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
  const entity = body.entity;
  const beforeData = await loadRecord(admin.token, entity, body.id);
  if (!beforeData) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
  try {
    let patch: Record<string, unknown> = {};
    let handledAtomically = false;
    if (entity === "organizations") {
      patch = { name_ar: clean(body.fields.name_ar, 160), name_en: clean(body.fields.name_en, 160) || null, description_ar: clean(body.fields.description_ar) || null, website_url: clean(body.fields.website_url, 500) || null, phone: clean(body.fields.phone, 80) || null, email: clean(body.fields.email, 200) || null };
      if (!patch.name_ar) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      await adminRest(admin.token, `organizations?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
      const locations = (beforeData.record.locations || []) as Array<{ id: string }>;
      if (locations[0]?.id) await adminRest(admin.token, `locations?id=eq.${locations[0].id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ address_ar: clean(body.fields.address_ar, 400), district_ar: clean(body.fields.district_ar, 160) || null, phone: clean(body.fields.location_phone, 80) || null }) });
    } else if (entity === "brands") {
      patch = { name_ar: clean(body.fields.name_ar, 160), name_en: clean(body.fields.name_en, 160) || null, website_url: clean(body.fields.website_url, 500) || null, manufacturer_organization_id: validId(clean(body.fields.manufacturer_organization_id)) ? clean(body.fields.manufacturer_organization_id) : null };
      const productKind = clean(body.fields.product_kind, 40);
      if (!patch.name_ar || !["roasted_coffee", "equipment", "consumable", "care_product", "replacement_part"].includes(productKind)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      await adminRest(admin.token, `brands?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
      await adminRest(admin.token, `brand_product_kinds?brand_id=eq.${body.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
      await adminRest(admin.token, "brand_product_kinds", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ brand_id: body.id, product_kind: productKind }) });
    } else if (entity === "products") {
      if (!body.contractRevision) return Response.json({ updated: false, reason: "contract_revision_required" }, { status: 409 });
      const categoryId = clean(body.fields.category_id, 36);
      patch = {
        name_ar: clean(body.fields.name_ar, 160),
        name_en: clean(body.fields.name_en, 160),
        summary_ar: clean(body.fields.summary_ar, 1000),
        description_ar: clean(body.fields.description_ar),
        model_number: clean(body.fields.model_number, 160),
        brand_id: validId(clean(body.fields.brand_id)) ? clean(body.fields.brand_id) : "",
        owner_organization_id: validId(clean(body.fields.owner_organization_id)) ? clean(body.fields.owner_organization_id) : "",
        category_id: validId(categoryId) ? categoryId : "",
        product_kind: clean(beforeData.record.product_kind, 40),
      };
      if (!patch.name_ar || !patch.category_id) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      const allDefinitions = ((beforeData.references as { filterDefinitions?: Array<ProductFieldDefinition & { category_id?: string }> }).filterDefinitions || beforeData.fieldDefinitions as Array<ProductFieldDefinition & { category_id?: string }>);
      const definitions = allDefinitions.filter((definition) => !definition.category_id || definition.category_id === categoryId);
      const values = serializeProductAttributes(body.attributes || [], definitions);
      const issueUpdates = (body.issueUpdates || []).flatMap((issue) => issue.id && validId(issue.id) && ["accepted", "fixed", "dismissed"].includes(issue.status || "") ? [{ id: issue.id, status: issue.status, resolution_note: clean(issue.resolutionNote, 1000) }] : []);
      await adminRest<Record<string, unknown>>(admin.token, "rpc/admin_update_product_v2", {
        method: "POST",
        headers: { "content-type": "application/json", prefer: "return=representation" },
        body: JSON.stringify({ p_product_id: body.id, p_fields: patch, p_values: values, p_issue_updates: issueUpdates, p_contract_revision: body.contractRevision }),
      });
      handledAtomically = true;
    } else if (entity === "offers") {
      patch = { price: Number(body.fields.price), currency_code: clean(body.fields.currency_code, 3) || "IQD", availability: clean(body.fields.availability, 30), external_url: clean(body.fields.external_url, 1000), observed_at: clean(body.fields.observed_at, 40) || new Date().toISOString() };
      await adminRest(admin.token, `offers?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
    } else if (entity === "contents") {
      patch = { title_ar: clean(body.fields.title_ar, 200), title_en: clean(body.fields.title_en, 200) || null, excerpt_ar: clean(body.fields.excerpt_ar, 1000) || null, body_ar: clean(body.fields.body_ar, 20000) };
      if (!patch.title_ar || clean(patch.body_ar).length < 20) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      await adminRest(admin.token, `contents?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
    } else {
      patch = { farm_or_producer_name: clean(body.fields.farm_or_producer_name, 300) || null, lot_reference: clean(body.fields.lot_reference, 160) || null, process_code: clean(body.fields.process_code, 120) || null, variety_codes: clean(body.fields.variety_codes, 500).split(/[،,]/).map((value) => value.trim()).filter(Boolean), harvest_label: clean(body.fields.harvest_label, 120) || null };
      await adminRest(admin.token, `origin_claims?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
    }
    if (!handledAtomically && Array.isArray(body.issueUpdates)) {
      for (const issue of body.issueUpdates) {
        if (!issue.id || !validId(issue.id) || !["accepted", "fixed", "dismissed"].includes(issue.status || "")) continue;
        await adminRest(admin.token, `data_quality_issues?id=eq.${issue.id}&entity_table=eq.${entity}&entity_id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ status: issue.status, resolution_note: clean(issue.resolutionNote, 1000) || "قرار إداري موثق من مركز العمليات", resolved_by: admin.user.id, resolved_at: new Date().toISOString() }) });
      }
    }
    if (!handledAtomically) await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "edit_record_before_publication", entity_table: entity, entity_id: body.id, before_data: beforeData.record, after_data: patch, source: "operations_center_v2" }) });
    return Response.json({ updated: true, ...(await loadRecord(admin.token, entity, body.id)) });
  } catch (error) {
    console.error("admin-record-patch", error instanceof Error ? error.message : error);
    if (isContractRevisionError(error)) return Response.json({ updated: false, reason: "contract_revision_stale" }, { status: 409 });
    if (error instanceof ProductAttributeError) return Response.json({ updated: false, reason: error.reason }, { status: 400 });
    return Response.json({ updated: false, reason: "upstream_error" }, { status: 502 });
  }
}

const restoreFields: Record<Entity, string[]> = {
  organizations: ["name_ar","name_en","description_ar","description_en","website_url","phone","email","logo_url","verification_tier","source_checked_at"],
  brands: ["name_ar","name_en","manufacturer_organization_id","website_url","logo_url"],
  products: ["name_ar","name_en","summary_ar","summary_en","description_ar","description_en","product_kind","brand_id","owner_organization_id","model_number","verification_tier","source_checked_at"],
  offers: ["price","currency_code","availability","external_url","observed_at","source_record_id"],
  contents: ["title_ar","title_en","excerpt_ar","excerpt_en","body_ar","body_en"],
  origin_claims: ["country_code","coffee_region_id","farm_or_producer_name","lot_reference","process_code","variety_codes","harvest_label","source_record_id","verification_tier"],
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ restored: false }, { status: 403 });
  const staff = await requireStaff(request, ["verifier", "admin"]).catch(() => null);
  if (!staff) return Response.json({ restored: false, reason: "verifier_required" }, { status: 403 });
  const body = await request.json().catch(() => null) as null | { action?: string; entity?: string; id?: string; eventId?: string };
  if (body?.action !== "restore_revision" || !body.entity || !isEntity(body.entity) || !body.id || !validId(body.id) || !body.eventId || !validId(body.eventId)) return Response.json({ restored: false, reason: "invalid_input" }, { status: 400 });
  const events = await adminRest<Array<{ before_data: Record<string, unknown> | null; action: string }>>(staff.token, `audit_events?select=before_data,action&id=eq.${body.eventId}&entity_table=eq.${body.entity}&entity_id=eq.${body.id}&limit=1`);
  const snapshot = events[0]?.before_data;
  if (!snapshot) return Response.json({ restored: false, reason: "revision_has_no_snapshot" }, { status: 409 });
  const patch = Object.fromEntries(restoreFields[body.entity].filter((key) => Object.prototype.hasOwnProperty.call(snapshot, key)).map((key) => [key, snapshot[key]]));
  if (!Object.keys(patch).length) return Response.json({ restored: false, reason: "revision_has_no_restorable_fields" }, { status: 409 });
  const current = await loadRecord(staff.token, body.entity, body.id);
  await adminRest(staff.token, `${body.entity}?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(patch) });
  await adminRest(staff.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: staff.user.id, action: "restore_record_revision", entity_table: body.entity, entity_id: body.id, before_data: current?.record || null, after_data: { restored_from_event: body.eventId, ...patch }, source: "operations_center_v3" }) });
  return Response.json({ restored: true, ...(await loadRecord(staff.token, body.entity, body.id)) });
}
