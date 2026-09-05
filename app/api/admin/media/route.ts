import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { MEDIA_ATTESTATION_VERSION, MEDIA_ENTITIES, RIGHTS_BASES, cleanHttps, mapMediaError, mediaRpc, mediaStorageRequest, purposeForEntity, sanitizeFilename } from "@/lib/media-vault";

const SUPABASE_URL = process.env.SUPABASE_URL;
const validId = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const [products, offers, organizations, media, categories, vaultAssets] = await Promise.all([
      adminRest<Array<{ id: string; name_ar: string; status: string; product_kind: string; organizations: { id: string; name_ar: string } | null; product_categories: Array<{ is_primary: boolean; categories: { id: string; code: string; name_ar: string; parent_id: string | null } | null }>; product_attribute_values: Array<{ value_text: string | null; field_definitions: { code: string } | null }> }>>(admin.token, "products?select=id,name_ar,status,product_kind,organizations(id,name_ar),product_categories(is_primary,categories(id,code,name_ar,parent_id)),product_attribute_values(value_text,field_definitions(code))&status=neq.archived&order=name_ar.asc&limit=1000"),
      adminRest<Array<{ id: string; status: string; products: { id: string; name_ar: string; product_kind: string; product_categories: Array<{ is_primary: boolean; categories: { id: string; code: string; name_ar: string; parent_id: string | null } | null }>; product_attribute_values: Array<{ value_text: string | null; field_definitions: { code: string } | null }> } | null; organizations: { id: string; name_ar: string; organization_roles: Array<{ role_type: string; is_primary: boolean }> } | null }>>(admin.token, "offers?select=id,status,products(id,name_ar,product_kind,product_categories(is_primary,categories(id,code,name_ar,parent_id)),product_attribute_values(value_text,field_definitions(code))),organizations(id,name_ar,organization_roles(role_type,is_primary))&status=neq.archived&order=updated_at.desc&limit=1000"),
      adminRest<Array<{ id: string; name_ar: string; status: string; organization_roles: Array<{ role_type: string; is_primary: boolean }> }>>(admin.token, "organizations?select=id,name_ar,status,organization_roles(role_type,is_primary)&status=neq.archived&order=name_ar.asc&limit=1000"),
      adminRest<Array<{ id: string; entity_table: string; entity_id: string; alt_ar: string; rights_note: string; url: string }>>(admin.token, "entity_media?select=id,entity_table,entity_id,alt_ar,rights_note,url&order=created_at.desc&limit=5000"),
      adminRest<Array<{ id: string; parent_id: string | null; catalog_family_id: string | null; catalog_filter_id: string | null }>>(admin.token, "categories?select=id,parent_id,catalog_family_id,catalog_filter_id&limit=500"),
      adminRest<Array<Record<string,unknown>>>(admin.token,"media_assets?select=id,purpose,original_filename,declared_mime,detected_mime,byte_size,width,height,pixel_count,sha256_hex,technical_status,publication_status,rejection_codes,duplicate_of_asset_id,legal_hold,created_at,media_asset_links(id,entity_type,entity_id,role,alt_ar,link_status),media_rights_assertions(rights_basis,copyright_owner,review_status)&order=created_at.desc&limit=300"),
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
    return Response.json({ authenticated: true, records, suspicious, vaultAssets });
  } catch (error) {
    console.error("admin-media-library", error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ created: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ created: false }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string,unknown> | null;
  const entity = String(body?.entity || "");
  const entityId = String(body?.entityId || "");
  const filename = sanitizeFilename(body?.filename);
  const declaredMime = String(body?.declaredMime || "").toLowerCase();
  const altAr = String(body?.altAr || "").trim().slice(0,300);
  const rightsBasis = String(body?.rightsBasis || "");
  const copyrightOwner = String(body?.copyrightOwner || "").trim().slice(0,300);
  const sourceUrl = cleanHttps(body?.sourceUrl);
  const licenseUrl = cleanHttps(body?.licenseUrl);
  const permissionEvidence = String(body?.permissionEvidence || "").trim().slice(0,2000) || null;
  const purpose = purposeForEntity(entity);
  const role = ({ organizations: "logo", brands: "logo", contents: "hero", origin_claims: "evidence" } as Record<string,string>)[entity] || "gallery";
  if (!MEDIA_ENTITIES.has(entity) || !validId(entityId) || !purpose) return Response.json({ created: false, reason: "invalid_target" }, { status: 400 });
  if (!filename || !declaredMime) return Response.json({ created: false, reason: "file_required" }, { status: 400 });
  if (altAr.length < 2) return Response.json({ created: false, reason: "alt_required" }, { status: 400 });
  if (!RIGHTS_BASES.has(rightsBasis) || copyrightOwner.length < 2) return Response.json({ created: false, reason: "rights_required" }, { status: 400 });
  if (body?.attested !== true || body?.commercialUseAllowed !== true || body?.modificationAllowed !== true) return Response.json({ created: false, reason: "attestation_required" }, { status: 400 });
  if (rightsBasis === "open_license" && !licenseUrl) return Response.json({ created: false, reason: "license_url_required" }, { status: 400 });
  if (["explicit_written_permission","exclusive_license","nonexclusive_license"].includes(rightsBasis) && !permissionEvidence) return Response.json({ created: false, reason: "permission_evidence_required" }, { status: 400 });
  try {
    const intent = await mediaRpc<{ intent_id:string; quarantine_path:string; max_bytes:number; expires_at:string }>(admin.token,"admin_media_begin_ingestion",{ p_payload: {
      purpose, entity_type:entity, entity_id:entityId, role, original_filename:filename, declared_mime:declaredMime, alt_ar:altAr,
      rights_basis:rightsBasis, copyright_owner:copyrightOwner, source_url:sourceUrl, license_url:licenseUrl, permission_evidence:permissionEvidence,
      commercial_use_allowed:true, modification_allowed:true, attestation_version:MEDIA_ATTESTATION_VERSION, attested:true,
    }});
    const signed = await mediaStorageRequest(admin.token,`object/upload/sign/media-quarantine/${intent.quarantine_path}`,{ method:"POST",headers:{"content-type":"application/json","x-upsert":"false"},body:"{}" });
    if (!signed.ok) throw new Error(`signed_upload_${signed.status}:${(await signed.text()).slice(0,120)}`);
    const signedData = await signed.json() as { url:string };
    const signedUploadUrl = `${SUPABASE_URL}/storage/v1${signedData.url}`;
    return Response.json({ created:true, intentId:intent.intent_id, path:intent.quarantine_path, signedUploadUrl, maxBytes:intent.max_bytes, expiresAt:intent.expires_at });
  } catch (error) {
    console.error("admin-media-intent", error instanceof Error ? error.message : error);
    return Response.json({ created:false, reason:mapMediaError(error) }, { status:502 });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ deleted: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ deleted: false }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id || !validId(body.id)) return Response.json({ deleted: false, reason: "invalid_input" }, { status: 400 });
  const rows = await adminRest<Array<{ id: string; asset_id: string }>>(admin.token, `entity_media?select=id,asset_id&id=eq.${body.id}&limit=1`);
  const media = rows[0];
  if (!media) return Response.json({ deleted: false, reason: "not_found" }, { status: 404 });
  try {
    await mediaRpc(admin.token,"admin_media_vault_action",{p_action:"unlink",p_asset_ids:[media.asset_id],p_payload:{reason:"record_editor_unlink"}});
    return Response.json({ deleted:true,unlinked:true,permanentDeletion:false });
  } catch(error) {
    return Response.json({deleted:false,reason:mapMediaError(error)},{status:502});
  }
}
