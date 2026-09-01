import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const entities = new Set(["organizations", "brands", "products", "offers", "contents", "origin_claims"]);
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const extensionMime: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

async function storageRequest(token: string, path: string, init: RequestInit) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("not_configured");
  return fetch(`${SUPABASE_URL}/storage/v1/${path}`, { ...init, headers: { apikey: SUPABASE_KEY, authorization: `Bearer ${token}`, ...(init.headers || {}) } });
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const [products, offers, organizations, media, categories] = await Promise.all([
      adminRest<Array<{ id: string; name_ar: string; status: string; product_kind: string; organizations: { id: string; name_ar: string } | null; product_categories: Array<{ is_primary: boolean; categories: { id: string; code: string; name_ar: string; parent_id: string | null } | null }>; product_attribute_values: Array<{ value_text: string | null; field_definitions: { code: string } | null }> }>>(admin.token, "products?select=id,name_ar,status,product_kind,organizations(id,name_ar),product_categories(is_primary,categories(id,code,name_ar,parent_id)),product_attribute_values(value_text,field_definitions(code))&status=neq.archived&order=name_ar.asc&limit=1000"),
      adminRest<Array<{ id: string; status: string; products: { id: string; name_ar: string; product_kind: string; product_categories: Array<{ is_primary: boolean; categories: { id: string; code: string; name_ar: string; parent_id: string | null } | null }>; product_attribute_values: Array<{ value_text: string | null; field_definitions: { code: string } | null }> } | null; organizations: { id: string; name_ar: string; organization_roles: Array<{ role_type: string; is_primary: boolean }> } | null }>>(admin.token, "offers?select=id,status,products(id,name_ar,product_kind,product_categories(is_primary,categories(id,code,name_ar,parent_id)),product_attribute_values(value_text,field_definitions(code))),organizations(id,name_ar,organization_roles(role_type,is_primary))&status=neq.archived&order=updated_at.desc&limit=1000"),
      adminRest<Array<{ id: string; name_ar: string; status: string; organization_roles: Array<{ role_type: string; is_primary: boolean }> }>>(admin.token, "organizations?select=id,name_ar,status,organization_roles(role_type,is_primary)&status=neq.archived&order=name_ar.asc&limit=1000"),
      adminRest<Array<{ id: string; entity_table: string; entity_id: string; alt_ar: string; rights_note: string; url: string }>>(admin.token, "entity_media?select=id,entity_table,entity_id,alt_ar,rights_note,url&order=created_at.desc&limit=5000"),
      adminRest<Array<{ id: string; parent_id: string | null; catalog_family_id: string | null; catalog_filter_id: string | null }>>(admin.token, "categories?select=id,parent_id,catalog_family_id,catalog_filter_id&limit=500"),
    ]);
    const mediaCounts = new Map<string, number>();
    for (const item of media) {
      const key = `${item.entity_table}:${item.entity_id}`;
      mediaCounts.set(key, (mediaCounts.get(key) || 0) + 1);
    }
    const count = (entity: string, id: string) => mediaCounts.get(`${entity}:${id}`) || 0;
    const primaryRole = (roles: Array<{ role_type: string; is_primary: boolean }> = []) => roles.find((role) => role.is_primary)?.role_type || roles[0]?.role_type || "other";
    const categoryParentById = new Map(categories.map((category) => [category.id, category.parent_id]));
    const categoryCatalogById = new Map(categories.map((category) => [category.id, category]));
    const categoryPathIds = (categoryId: string | null) => {
      const path: string[] = [];
      const visited = new Set<string>();
      let currentId = categoryId;
      while (currentId && !visited.has(currentId)) {
        path.push(currentId); visited.add(currentId);
        currentId = categoryParentById.get(currentId) || null;
      }
      const catalog = categoryId ? categoryCatalogById.get(categoryId) : null;
      for (const mappedId of [catalog?.catalog_family_id, catalog?.catalog_filter_id]) {
        if (mappedId && !visited.has(mappedId)) path.push(mappedId);
      }
      return path;
    };
    const productMeta = (product: { product_categories: Array<{ is_primary: boolean; categories: { id: string; code: string; name_ar: string; parent_id: string | null } | null }>; product_attribute_values: Array<{ value_text: string | null; field_definitions: { code: string } | null }> }) => {
      const category = product.product_categories?.find((item) => item.is_primary)?.categories || product.product_categories?.[0]?.categories || null;
      const coffeeForm = product.product_attribute_values?.find((item) => item.field_definitions?.code === "coffee_form")?.value_text || null;
      return { categoryId: category?.id || null, categoryPathIds: categoryPathIds(category?.id || null), categoryCode: category?.code || null, categoryName: category?.name_ar || null, coffeeForm };
    };
    const records = [
      ...products.map((row) => ({ scope: "master", entity: "products", id: row.id, label: row.name_ar, status: row.status, productKind: row.product_kind, organizationId: row.organizations?.id || null, organizationName: row.organizations?.name_ar || null, organizationRole: null, mediaCount: count("products", row.id), ...productMeta(row) })),
      ...offers.map((row) => ({ scope: "participant", entity: "offers", id: row.id, label: row.products?.name_ar || "منتج", status: row.status, productKind: row.products?.product_kind || "other", organizationId: row.organizations?.id || null, organizationName: row.organizations?.name_ar || "جهة غير محددة", organizationRole: primaryRole(row.organizations?.organization_roles), organizationRoles: row.organizations?.organization_roles.map((role) => role.role_type) || [], mediaCount: count("offers", row.id), ...(row.products ? productMeta(row.products) : { categoryId:null,categoryPathIds:[],categoryCode:null,categoryName:null,coffeeForm:null }) })),
      ...organizations.map((row) => ({ scope: "participant", entity: "organizations", id: row.id, label: row.name_ar, status: row.status, productKind: "organization", organizationId: row.id, organizationName: row.name_ar, organizationRole: primaryRole(row.organization_roles), organizationRoles: row.organization_roles.map((role) => role.role_type), mediaCount: count("organizations", row.id), categoryId:null,categoryPathIds:[],categoryCode:null,categoryName:null,coffeeForm:null })),
    ];
    const targetByKey = new Map(records.map((row) => [`${row.entity}:${row.id}`, row]));
    const codeTokens = (value: string) => value.toLocaleLowerCase("en").match(/[a-z]+\d+[a-z0-9-]*/g) || [];
    const suspicious = media.flatMap((item) => {
      const target = targetByKey.get(`${item.entity_table}:${item.entity_id}`);
      const foreignCode = target && codeTokens(item.alt_ar).find((token) => !target.label.toLocaleLowerCase("en").includes(token));
      const reason = item.alt_ar.trim().length < 3 ? "الوصف البديل غير كافٍ" : item.rights_note.trim().length < 3 ? "بيان الحقوق غير كافٍ" : foreignCode ? `الوصف يذكر «${foreignCode}» ولا يظهر في اسم السجل` : "";
      return reason && target ? [{ id: item.id, entity: target.entity, entityId: target.id, label: target.label, altAr: item.alt_ar, reason }] : [];
    });
    return Response.json({ authenticated: true, records, suspicious });
  } catch (error) {
    console.error("admin-media-library", error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ uploaded: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ uploaded: false }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const entity = String(form?.get("entity") || "");
  const entityId = String(form?.get("entityId") || "");
  const altAr = String(form?.get("altAr") || "").trim().slice(0, 300);
  const rightsNote = String(form?.get("rightsNote") || "").trim().slice(0, 1000);
  const file = form?.get("file");
  if (!entities.has(entity) || !validId(entityId)) return Response.json({ uploaded: false, reason: "invalid_target" }, { status: 400 });
  if (!(file instanceof File) || file.size < 1) return Response.json({ uploaded: false, reason: "file_required" }, { status: 400 });
  if (file.size > MAX_MEDIA_BYTES) return Response.json({ uploaded: false, reason: "file_too_large", maxBytes: MAX_MEDIA_BYTES, receivedBytes: file.size }, { status: 400 });
  if (altAr.length < 2) return Response.json({ uploaded: false, reason: "alt_required" }, { status: 400 });
  if (rightsNote.length < 3) return Response.json({ uploaded: false, reason: "rights_required" }, { status: 400 });
  const nameExtension = file.name.toLowerCase().split(".").pop() || "";
  const normalizedMime = mimeExtensions[file.type] ? file.type : extensionMime[nameExtension];
  if (!normalizedMime || !mimeExtensions[normalizedMime]) return Response.json({ uploaded: false, reason: "unsupported_type", receivedType: file.type || "unknown" }, { status: 400 });
  const path = `catalog/${entity}/${entityId}/${crypto.randomUUID()}.${mimeExtensions[normalizedMime]}`;
  let objectUploaded = false;
  try {
    const upload = await storageRequest(admin.token, `object/public-media/${path}`, { method: "POST", headers: { "content-type": normalizedMime, "x-upsert": "false" }, body: await file.arrayBuffer() });
    if (!upload.ok) {
      const storageMessage = (await upload.text()).slice(0, 180);
      console.error("admin-media-storage", `status=${upload.status}`, storageMessage);
      return Response.json({ uploaded: false, reason: "storage_rejected", storageStatus: upload.status }, { status: 502 });
    }
    objectUploaded = true;
    const existing = await adminRest<Array<{ id: string }>>(admin.token, `entity_media?select=id&entity_table=eq.${entity}&entity_id=eq.${entityId}&is_primary=eq.true&limit=1`);
    const url = `${SUPABASE_URL}/storage/v1/object/public/public-media/${path}`;
    const created = await adminRest<Array<Record<string, unknown>>>(admin.token, "entity_media?select=*", { method: "POST", headers: { "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify({ entity_table: entity, entity_id: entityId, storage_path: path, url, alt_ar: altAr, rights_note: rightsNote, is_primary: !existing.length, created_by: admin.user.id }) });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "upload_catalog_media", entity_table: entity, entity_id: entityId, after_data: { path, alt_ar: altAr, rights_note: rightsNote }, source: "operations_center_v5" }) });
    return Response.json({ uploaded: true, media: created[0] });
  } catch (error) {
    if (objectUploaded) await storageRequest(admin.token, `object/public-media/${path}`, { method: "DELETE" }).catch(() => null);
    console.error("admin-media-upload", error instanceof Error ? error.message : error);
    return Response.json({ uploaded: false, reason: objectUploaded ? "media_link_failed" : "upstream_error" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ deleted: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ deleted: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id || !validId(body.id)) return Response.json({ deleted: false, reason: "invalid_input" }, { status: 400 });
  const rows = await adminRest<Array<{ id: string; entity_table: string; entity_id: string; storage_path: string; is_primary: boolean }>>(admin.token, `entity_media?select=id,entity_table,entity_id,storage_path,is_primary&id=eq.${body.id}&limit=1`);
  const media = rows[0];
  if (!media) return Response.json({ deleted: false, reason: "not_found" }, { status: 404 });
  const removed = await storageRequest(admin.token, `object/public-media/${media.storage_path}`, { method: "DELETE" });
  if (!removed.ok && removed.status !== 404) return Response.json({ deleted: false, reason: "storage_error" }, { status: 502 });
  await adminRest(admin.token, `entity_media?id=eq.${media.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  if (media.is_primary) {
    const next = await adminRest<Array<{ id: string }>>(admin.token, `entity_media?select=id&entity_table=eq.${media.entity_table}&entity_id=eq.${media.entity_id}&order=sort_order.asc,created_at.asc&limit=1`);
    if (next[0]) await adminRest(admin.token, `entity_media?id=eq.${next[0].id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ is_primary: true }) });
  }
  await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "delete_catalog_media", entity_table: media.entity_table, entity_id: media.entity_id, before_data: { storage_path: media.storage_path }, source: "operations_center_v5" }) });
  return Response.json({ deleted: true });
}
