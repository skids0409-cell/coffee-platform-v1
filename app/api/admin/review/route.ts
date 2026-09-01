import { adminRest, requireStaff, sameOrigin } from "@/lib/supabase-admin";
import { normalizeSearchText, type SearchEntityType, type SearchIntent } from "@/lib/search-governance";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

type QueueRow = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  updated_at: string | null;
  ready: boolean;
  blockers: string[];
  warnings: string[];
};

type LinkRow = { entity_table: string; entity_id: string };
type IssueRow = { id: string; intake_row_id: string | null; entity_table: string | null; entity_id: string | null; issue_code: string; issue_type: string | null; field_code: string | null; severity: string; message_ar: string; recommended_action: string | null; created_at: string };
type IssueIntakeRow = { id: string; source_row_number: number; raw_payload: Record<string, unknown>; normalized_payload: Record<string, unknown>; target_table: string | null; target_id: string | null; data_import_batches: { batch_code: string; source_label: string } | null };
type SearchTermAdminRow = {
  id: string;
  canonical_term_ar: string;
  canonical_term_en: string | null;
  normalized_term: string;
  aliases: string[];
  intent: Exclude<SearchIntent, "unknown">;
  entity_scope: SearchEntityType[];
  match_mode: "exact" | "prefix" | "contains";
  weight: number;
  source_basis: string;
  status: "draft" | "active" | "retired";
  updated_at: string;
};
type SearchEventAdminRow = {
  normalized_query: string;
  inferred_intent: SearchIntent;
  result_count: number;
  created_at: string;
};

const countBy = (rows: Array<Record<string, unknown>>, key: string) => {
  const result = new Map<string, number>();
  for (const row of rows) {
    const id = String(row[key] || "");
    if (id) result.set(id, (result.get(id) || 0) + 1);
  }
  return result;
};

const issuesByEntity = (rows: IssueRow[], table: string, id: string) =>
  rows.filter((issue) => issue.entity_table === table && issue.entity_id === id);

async function loadQueue(token: string) {
  const [products, brands, organizations, offers, contents, origins, rights, betaFeedback, supportRequests, staffProfiles, categories, attributes, requiredRules, roles, locations, links, issues, searchTerms, searchEvents, supportHistory, publishedProducts, publishedBrands, publishedOrganizations, publishedOffers, publishedContents, publishedOrigins] = await Promise.all([
    adminRest<Array<{ id: string; name_ar: string; status: string; source_checked_at: string | null; verification_tier: string; brand_id: string | null; owner_organization_id: string | null; updated_at: string }>>(
      token,
      "products?select=id,name_ar,status,source_checked_at,verification_tier,brand_id,owner_organization_id,updated_at&status=in.(draft,in_review)&order=updated_at.desc&limit=100",
    ),
    adminRest<Array<{ id: string; name_ar: string; status: string; updated_at: string; brand_product_kinds: Array<{ product_kind: string }> }>>(token, "brands?select=id,name_ar,status,updated_at,brand_product_kinds(product_kind)&status=in.(draft,in_review)&order=updated_at.desc&limit=100"),
    adminRest<Array<{ id: string; name_ar: string; status: string; source_checked_at: string | null; verification_tier: string; updated_at: string }>>(
      token,
      "organizations?select=id,name_ar,status,source_checked_at,verification_tier,updated_at&status=in.(draft,in_review)&order=updated_at.desc&limit=100",
    ),
    adminRest<Array<{ id: string; status: string; observed_at: string; external_url: string; price: number | null; currency_code: string; availability: string; source_record_id: string | null; updated_at: string; products: { name_ar: string } | null; organizations: { name_ar: string } | null }>>(
      token,
      "offers?select=id,status,observed_at,external_url,price,currency_code,availability,source_record_id,updated_at,products(name_ar),organizations(name_ar)&status=in.(draft,in_review)&order=updated_at.desc&limit=100",
    ),
    adminRest<Array<{ id: string; title_ar: string; status: string; body_ar: string | null; updated_at: string }>>(
      token,
      "contents?select=id,title_ar,status,body_ar,updated_at&status=in.(draft,in_review)&order=updated_at.desc&limit=100",
    ),
    adminRest<Array<{ id: string; status: string; country_code: string | null; coffee_region_id: string | null; source_record_id: string; updated_at: string; products: { name_ar: string; status: string } | null; countries: { name_ar: string } | null; coffee_regions: { name_ar: string } | null }>>(token, "origin_claims?select=id,status,country_code,coffee_region_id,source_record_id,updated_at,products(name_ar,status),countries(name_ar),coffee_regions(name_ar)&status=in.(draft,in_review)&order=updated_at.desc&limit=100"),
    adminRest<Array<{ id: string; public_reference: string; request_type: string; status: string; target_reference_text: string | null; requester_name: string; requester_email: string; requester_phone: string | null; details: string; evidence_reference: string | null; consent_to_contact: boolean; created_at: string }>>(
      token,
      "rights_requests?select=id,public_reference,request_type,status,target_reference_text,requester_name,requester_email,requester_phone,details,evidence_reference,consent_to_contact,created_at&status=in.(submitted,needs_evidence,in_review)&order=created_at.desc&limit=50",
    ),
    adminRest<Array<{ id: string; public_reference: string; page_path: string; task_code: string; outcome: string; device_type: string; severity: string; feedback_text: string; status: string; created_at: string }>>(
      token,
      "beta_feedback?select=id,public_reference,page_path,task_code,outcome,device_type,severity,feedback_text,status,created_at&status=neq.resolved&order=created_at.desc&limit=100",
    ),
    adminRest<Array<{ id: string; public_reference: string; request_type: string; page_path: string; subject: string; message: string; preferred_channel: string; status: string; priority: string; assigned_to: string | null; internal_notes: string | null; resolution_note: string | null; technical_reference: string | null; created_at: string; updated_at: string }>>(
      token,
      "support_requests?select=id,public_reference,request_type,page_path,subject,message,preferred_channel,requester_name,requester_phone,requester_email,status,priority,assigned_to,internal_notes,resolution_note,technical_reference,escalated_at,customer_replied_at,archived_at,created_at,updated_at&order=created_at.desc&limit=200",
    ),
    adminRest<Array<{ id: string; display_name: string | null; role: string }>>(token, "profiles?select=id,display_name,role&is_active=eq.true&role=in.(editor,verifier,admin)&order=display_name.asc"),
    adminRest<Array<{ product_id: string; category_id: string }>>(token, "product_categories?select=product_id,category_id&is_primary=eq.true"),
    adminRest<Array<{ product_id: string; field_definition_id: string }>>(token, "product_attribute_values?select=product_id,field_definition_id"),
    adminRest<Array<{ category_id: string; field_definition_id: string; field_definitions: { code: string; name_ar: string } | null }>>(token, "filter_definitions?select=category_id,field_definition_id,field_definitions(code,name_ar)&status=eq.published&is_required_for_publish=eq.true"),
    adminRest<Array<Record<string, unknown>>>(token, "organization_roles?select=organization_id"),
    adminRest<Array<Record<string, unknown>>>(token, "locations?select=organization_id&status=neq.archived"),
    adminRest<LinkRow[]>(token, "entity_source_links?select=entity_table,entity_id"),
    adminRest<IssueRow[]>(token, "data_quality_issues?select=id,intake_row_id,entity_table,entity_id,issue_code,issue_type,field_code,severity,message_ar,recommended_action,created_at&status=eq.open"),
    adminRest<SearchTermAdminRow[]>(token, "search_terms?select=id,canonical_term_ar,canonical_term_en,normalized_term,aliases,intent,entity_scope,match_mode,weight,source_basis,status,updated_at&order=weight.desc,updated_at.desc&limit=300"),
    adminRest<SearchEventAdminRow[]>(token, "search_query_events?select=normalized_query,inferred_intent,result_count,created_at&order=created_at.desc&limit=500"),
    adminRest<Array<{ entity_id: string; action: string; after_data: Record<string, unknown> | null; created_at: string }>>(token, "audit_events?select=entity_id,action,after_data,created_at&entity_table=eq.support_requests&order=created_at.desc&limit=500"),
    adminRest<Array<{ id: string; name_ar: string; product_kind: string; updated_at: string; product_categories: Array<{ categories: { id: string; parent_id: string | null; name_ar: string } | null }> }>>(token, "products?select=id,name_ar,product_kind,updated_at,product_categories(categories(id,parent_id,name_ar))&status=eq.published&order=updated_at.desc&limit=500"),
    adminRest<Array<{ id: string; name_ar: string; updated_at: string; brand_product_kinds: Array<{ product_kind: string }> }>>(token, "brands?select=id,name_ar,updated_at,brand_product_kinds(product_kind)&status=eq.published&order=updated_at.desc&limit=500"),
    adminRest<Array<{ id: string; name_ar: string; website_url: string | null; phone: string | null; email: string | null; updated_at: string; organization_roles: Array<{ role_type: string; is_primary: boolean }> }>>(token, "organizations?select=id,name_ar,website_url,phone,email,updated_at,organization_roles(role_type,is_primary)&status=eq.published&order=updated_at.desc&limit=1000"),
    adminRest<Array<{ id: string; price: number | null; currency_code: string; updated_at: string; products: { name_ar: string; product_kind: string; product_categories: Array<{ categories: { id: string; parent_id: string | null; name_ar: string } | null }> } | null; organizations: { name_ar: string } | null }>>(token, "offers?select=id,price,currency_code,updated_at,products(name_ar,product_kind,product_categories(categories(id,parent_id,name_ar))),organizations(name_ar)&status=eq.published&order=updated_at.desc&limit=500"),
    adminRest<Array<{ id: string; title_ar: string; type: string; updated_at: string }>>(token, "contents?select=id,title_ar,type,updated_at&status=eq.published&order=updated_at.desc&limit=500"),
    adminRest<Array<{ id: string; updated_at: string; products: { name_ar: string } | null; countries: { name_ar: string } | null }>>(token, "origin_claims?select=id,updated_at,products(name_ar),countries(name_ar)&status=eq.published&order=updated_at.desc&limit=500"),
  ]);
  const intakeIds = issues.map((issue) => issue.intake_row_id).filter((id): id is string => Boolean(id));
  const issueIntakeRows = intakeIds.length ? await adminRest<IssueIntakeRow[]>(token, `data_intake_rows?select=id,source_row_number,raw_payload,normalized_payload,target_table,target_id,data_import_batches(batch_code,source_label)&id=in.(${intakeIds.join(",")})`) : [];
  const issueIntakeById = new Map(issueIntakeRows.map((row) => [row.id, row]));
  const [inactiveProducts, inactiveBrands, inactiveOrganizations, inactiveOffers, inactiveContents, inactiveOrigins] = await Promise.all([
    adminRest<Array<{ id: string; name_ar: string; status: string; updated_at: string }>>(token, "products?select=id,name_ar,status,updated_at&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
    adminRest<Array<{ id: string; name_ar: string; status: string; updated_at: string }>>(token, "brands?select=id,name_ar,status,updated_at&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
    adminRest<Array<{ id: string; name_ar: string; status: string; updated_at: string }>>(token, "organizations?select=id,name_ar,status,updated_at&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
    adminRest<Array<{ id: string; status: string; updated_at: string; products: { name_ar: string } | null; organizations: { name_ar: string } | null }>>(token, "offers?select=id,status,updated_at,products(name_ar),organizations(name_ar)&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
    adminRest<Array<{ id: string; title_ar: string; status: string; updated_at: string }>>(token, "contents?select=id,title_ar,status,updated_at&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
    adminRest<Array<{ id: string; status: string; updated_at: string; products: { name_ar: string } | null }>>(token, "origin_claims?select=id,status,updated_at,products(name_ar)&status=in.(rejected,archived)&order=updated_at.desc&limit=200"),
  ]);
  const mediaRows = await adminRest<Array<{ entity_table: string; entity_id: string }>>(token, "entity_media?select=entity_table,entity_id&limit=5000");
  const mediaKeys = new Set(mediaRows.map((row) => `${row.entity_table}:${row.entity_id}`));
  const taxonomyCategories = await adminRest<Array<{ id: string; code: string; name_ar: string; parent_id: string | null }>>(token, "categories?select=id,code,name_ar,parent_id&status=eq.published&order=sort_order.asc");
  const taxonomyById = new Map(taxonomyCategories.map((category) => [category.id, category]));
  const taxonomyPath = (category: { id: string; parent_id: string | null; name_ar: string } | null | undefined, fallback: string) => {
    if (!category) return fallback;
    const names = [category.name_ar];
    let parent = category.parent_id ? taxonomyById.get(category.parent_id) : undefined;
    while (parent) {
      if (!["EQP", "COF"].includes(parent.code)) names.unshift(parent.name_ar);
      parent = parent.parent_id ? taxonomyById.get(parent.parent_id) : undefined;
    }
    return names.join(" ← ");
  };
  const catalogSectionForKind = (kind: string) => ({ roasted_coffee: "coffee", equipment: "equipment", consumable: "consumables", care_product: "care", replacement_part: "parts" } as Record<string,string>)[kind] || "equipment";
  const categoryCounts = countBy(categories, "product_id");
  const attributeCounts = countBy(attributes, "product_id");
  const categoryByProduct = new Map(categories.map((row) => [row.product_id, row.category_id]));
  const attributesByProduct = new Map<string, Set<string>>();
  for (const row of attributes) {
    const current = attributesByProduct.get(row.product_id) || new Set<string>();
    current.add(row.field_definition_id);
    attributesByProduct.set(row.product_id, current);
  }
  const rulesByCategory = new Map<string, typeof requiredRules>();
  for (const rule of requiredRules) rulesByCategory.set(rule.category_id, [...(rulesByCategory.get(rule.category_id) || []), rule]);
  const roleCounts = countBy(roles, "organization_id");
  const locationCounts = countBy(locations, "organization_id");
  const linkCounts = new Map<string, number>();
  for (const link of links) {
    const key = `${link.entity_table}:${link.entity_id}`;
    linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
  }
  const productRows = products.map((row) => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (row.status !== "in_review") blockers.push("الحالة ليست قيد المراجعة");
    if (!row.source_checked_at) blockers.push("تاريخ فحص المصدر مفقود");
    if (row.verification_tier === "t1_unverified") blockers.push("المصدر غير متحقق");
    if (!categoryCounts.get(row.id)) blockers.push("الفئة الرئيسية مفقودة");
    const productAttributes = attributesByProduct.get(row.id) || new Set<string>();
    for (const rule of rulesByCategory.get(categoryByProduct.get(row.id) || "") || []) {
      const code = rule.field_definitions?.code;
      const satisfiedByProductField = code === "brand_id" ? Boolean(row.brand_id) : code === "roaster_org_id" ? Boolean(row.owner_organization_id) : false;
      if (!satisfiedByProductField && !productAttributes.has(rule.field_definition_id)) blockers.push(`المواصفة المطلوبة مفقودة: ${rule.field_definitions?.name_ar || code || "حقل منظم"}`);
    }
    if (!linkCounts.get(`products:${row.id}`)) blockers.push("رابط الدليل والمصدر مفقود");
    for (const issue of issuesByEntity(issues, "products", row.id)) {
      if (["blocker", "high"].includes(issue.severity)) blockers.push(issue.message_ar);
      else warnings.push(issue.message_ar);
    }
    return { id: row.id, label: row.name_ar, status: row.status, evidence: `${row.verification_tier} · ${categoryCounts.get(row.id) || 0} فئة · ${attributeCounts.get(row.id) || 0} مواصفة · ${linkCounts.get(`products:${row.id}`) || 0} مصدر`, updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings };
  });
  const organizationRows = organizations.map((row) => {
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (row.status !== "in_review") blockers.push("الحالة ليست قيد المراجعة");
    if (!row.source_checked_at) blockers.push("تاريخ فحص المصدر مفقود");
    if (row.verification_tier === "t1_unverified") blockers.push("المصدر غير متحقق");
    if (!roleCounts.get(row.id)) blockers.push("نوع الجهة مفقود");
    if (!locationCounts.get(row.id)) blockers.push("لا يوجد موقع موثق");
    if (!linkCounts.get(`organizations:${row.id}`)) blockers.push("رابط الدليل والمصدر مفقود");
    for (const issue of issuesByEntity(issues, "organizations", row.id)) {
      if (["blocker", "high"].includes(issue.severity)) blockers.push(issue.message_ar);
      else warnings.push(issue.message_ar);
    }
    return { id: row.id, label: row.name_ar, status: row.status, evidence: `${row.verification_tier} · ${roleCounts.get(row.id) || 0} أدوار · ${locationCounts.get(row.id) || 0} مواقع · ${linkCounts.get(`organizations:${row.id}`) || 0} مصدر`, updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings };
  });
  const brandRows = brands.map((row) => {
    const blockers: string[] = [];
    if (row.status !== "in_review") blockers.push("الحالة ليست قيد المراجعة");
    if (!row.brand_product_kinds.length) blockers.push("عائلة منتجات العلامة مفقودة");
    if (!linkCounts.get(`brands:${row.id}`)) blockers.push("مصدر العلامة مفقود");
    return { id: row.id, label: row.name_ar, status: row.status, evidence: `${row.brand_product_kinds.map((item) => item.product_kind).join("، ")} · ${linkCounts.get(`brands:${row.id}`) || 0} مصدر`, updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings: [] };
  });
  const offerRows = offers.map((row) => {
    const blockers: string[] = [];
    if (row.status !== "in_review") blockers.push("الحالة ليست قيد المراجعة");
    if (!row.external_url || !/^https?:\/\//i.test(row.external_url)) blockers.push("رابط العرض غير صالح");
    if (!row.observed_at) blockers.push("تاريخ الرصد مفقود");
    if (row.price === null || !row.currency_code) blockers.push("السعر أو العملة مفقود");
    if (!row.source_record_id) blockers.push("مصدر العرض مفقود");
    if (row.availability === "unknown") blockers.push("التوفر غير متحقق");
    return { id: row.id, label: `${row.products?.name_ar || "منتج"} — ${row.organizations?.name_ar || "بائع"}`, status: row.status, evidence: `${row.price?.toLocaleString("ar-IQ") || "—"} ${row.currency_code} · ${row.availability}`, updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings: [] };
  });
  const contentRows = contents.map((row) => {
    const blockers = [row.status !== "in_review" ? "الحالة ليست قيد المراجعة" : "", !row.body_ar?.trim() ? "النص العربي مفقود" : ""].filter(Boolean);
    return { id: row.id, label: row.title_ar, status: row.status, evidence: row.body_ar ? "نص عربي موجود" : "النص ناقص", updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings: [] };
  });
  const rows: Record<string, QueueRow[]> = {
    products: productRows,
    brands: brandRows,
    organizations: organizationRows,
    offers: offerRows,
    contents: contentRows,
    origins: origins.map((row) => {
      const blockers = [row.status !== "in_review" ? "الحالة ليست قيد المراجعة" : "", !row.source_record_id ? "المصدر مفقود" : "", !row.country_code ? "الدولة مفقودة" : "", !row.products ? "المنتج مفقود" : ""].filter(Boolean);
      return { id: row.id, label: `${row.products?.name_ar || "قهوة"} — ${row.coffee_regions?.name_ar || row.countries?.name_ar || "منشأ"}`, status: row.status, evidence: `${row.countries?.name_ar || "—"} · ${row.coffee_regions?.name_ar || "منطقة غير محددة"}`, updated_at: row.updated_at, ready: blockers.length === 0, blockers, warnings: [] };
    }),
    rights: rights.map((row) => ({ id: row.id, label: `${row.request_type} — ${row.target_reference_text || "دون مرجع"}`, status: row.status, evidence: `${row.public_reference} · مقدم الطلب: ${row.requester_name} · ${row.requester_email}${row.requester_phone ? ` · ${row.requester_phone}` : ""}`, updated_at: row.created_at, ready: false, blockers: [], warnings: [row.details, row.evidence_reference ? `الدليل المرفق: ${row.evidence_reference}` : "لا يوجد دليل مرفق", row.consent_to_contact ? "وافق على التواصل" : "لم يوافق على التواصل" ] })),
    beta: betaFeedback.map((row) => ({ id: row.id, label: row.feedback_text, status: row.status, evidence: `${row.public_reference} · ${row.task_code} · ${row.outcome} · ${row.severity} · ${row.page_path}`, updated_at: row.created_at, ready: false, blockers: [], warnings: [`الجهاز: ${row.device_type}`] })),
    support: supportRequests.map((row) => ({ id: row.id, label: row.subject, status: row.status, evidence: `${row.public_reference} · ${row.request_type} · ${row.preferred_channel} · ${row.page_path}`, updated_at: row.created_at, ready: false, blockers: [], warnings: [row.message] })),
  };
  const weakQueryMap = new Map<string, { query: string; searches: number; zeroResults: number; lowResults: number; lastSearchedAt: string; inferredIntent: SearchIntent }>();
  for (const event of searchEvents) {
    if (event.result_count > 1) continue;
    const existing = weakQueryMap.get(event.normalized_query);
    const candidate = existing || {
      query: event.normalized_query,
      searches: 0,
      zeroResults: 0,
      lowResults: 0,
      lastSearchedAt: event.created_at,
      inferredIntent: event.inferred_intent,
    };
    candidate.searches += 1;
    candidate.zeroResults += event.result_count === 0 ? 1 : 0;
    candidate.lowResults += event.result_count === 1 ? 1 : 0;
    if (event.created_at > candidate.lastSearchedAt) candidate.lastSearchedAt = event.created_at;
    weakQueryMap.set(event.normalized_query, candidate);
  }
  const weakQueries = [...weakQueryMap.values()]
    .sort((a, b) => b.zeroResults - a.zeroResults || b.searches - a.searches || b.lastSearchedAt.localeCompare(a.lastSearchedAt))
    .slice(0, 30);
  return {
    queues: rows,
    inactiveCatalog: [
      ...inactiveProducts.map((row) => ({ entity: "products", ...row, label: row.name_ar })),
      ...inactiveBrands.map((row) => ({ entity: "brands", ...row, label: row.name_ar })),
      ...inactiveOrganizations.map((row) => ({ entity: "organizations", ...row, label: row.name_ar })),
      ...inactiveOffers.map((row) => ({ entity: "offers", ...row, label: `${row.products?.name_ar || "منتج"} — ${row.organizations?.name_ar || "بائع"}` })),
      ...inactiveContents.map((row) => ({ entity: "contents", ...row, label: row.title_ar })),
      ...inactiveOrigins.map((row) => ({ entity: "origin_claims", ...row, label: `${row.products?.name_ar || "قهوة"} — مصدر` })),
    ].sort((a,b) => b.updated_at.localeCompare(a.updated_at)),
    publishedCatalog: [
      ...publishedOrganizations.map((row) => ({ entity: "organizations", section: "directory", group: ({ cafe: "المقاهي", roaster: "المحامص", seller: "البائعون", equipment_supplier: "موردو المعدات", manufacturer: "المصنعون", importer: "المستوردون", service_provider: "الصيانة والخدمات" } as Record<string,string>)[row.organization_roles.find((role) => role.is_primary)?.role_type || row.organization_roles[0]?.role_type] || "جهات أخرى", id: row.id, label: row.name_ar, meta: "جهة منشورة", updated_at: row.updated_at })),
      ...publishedBrands.map((row) => ({ entity: "brands", section: "brands", group: row.brand_product_kinds.some((kind) => kind.product_kind === "roasted_coffee") ? "علامات القهوة" : "علامات المعدات والمنتجات", id: row.id, label: row.name_ar, meta: "علامة تجارية منشورة", updated_at: row.updated_at })),
      ...publishedProducts.map((row) => ({ entity: "products", section: catalogSectionForKind(row.product_kind), group: taxonomyPath(row.product_categories?.[0]?.categories, row.product_kind === "roasted_coffee" ? "القهوة المحمصة" : "منتجات ومعدات"), id: row.id, label: row.name_ar, meta: row.product_kind === "roasted_coffee" ? "قهوة منشورة" : "منتج منشور", updated_at: row.updated_at })),
      ...publishedOffers.map((row) => ({ entity: "offers", section: "offers", group: taxonomyPath(row.products?.product_categories?.[0]?.categories, row.products?.product_kind === "roasted_coffee" ? "عروض القهوة" : "عروض المنتجات"), id: row.id, label: `${row.products?.name_ar || "منتج"} — ${row.organizations?.name_ar || "بائع"}`, meta: `${row.price ?? "—"} ${row.currency_code}`, updated_at: row.updated_at })),
      ...publishedContents.map((row) => ({ entity: "contents", section: "learn", group: ({ article: "المقالات", guide: "الأدلة", lesson: "الدروس", glossary: "المصطلحات" } as Record<string,string>)[row.type] || "التعلم والمعرفة", id: row.id, label: row.title_ar, meta: "محتوى منشور", updated_at: row.updated_at })),
      ...publishedOrigins.map((row) => ({ entity: "origin_claims", section: "origins", group: "مصادر القهوة", id: row.id, label: `${row.products?.name_ar || "قهوة"} — ${row.countries?.name_ar || "منشأ"}`, meta: "مصدر قهوة منشور", updated_at: row.updated_at })),
    ].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    qualityDesk: {
      summary: {
        openIssues: issues.length,
        missingProductImages: publishedProducts.filter((row) => !mediaKeys.has(`products:${row.id}`)).length,
        missingOfferImages: publishedOffers.filter((row) => !mediaKeys.has(`offers:${row.id}`)).length,
        recordsPendingReview: productRows.length + brandRows.length + organizationRows.length + offerRows.length + contentRows.length + origins.length,
      },
      suspects: [
        ...issues.map((issue) => {
          const intake = issue.intake_row_id ? issueIntakeById.get(issue.intake_row_id) : null;
          const rawName = String(intake?.raw_payload?.name_ar || intake?.raw_payload?.name || "").trim();
          return {
          id: issue.id,
          entity: issue.entity_table || intake?.target_table || "unlinked",
          entityId: issue.entity_id || intake?.target_id || null,
          label: rawName || issue.message_ar,
          reason: issue.entity_id ? "ملاحظة جودة مرتبطة بسجل" : "ملاحظة غير مربوطة بسجل نهائي",
          severity: issue.severity,
          recommendedAction: issue.recommended_action,
          issueDetails: { issueCode: issue.issue_code, issueType: issue.issue_type, fieldCode: issue.field_code, message: issue.message_ar, createdAt: issue.created_at, batchCode: intake?.data_import_batches?.batch_code || null, sourceLabel: intake?.data_import_batches?.source_label || null, sourceRowNumber: intake?.source_row_number || null, rawPayload: intake?.raw_payload || null, normalizedPayload: intake?.normalized_payload || null },
        }; }),
        ...publishedOrganizations.filter((row) => {
          const rolesForRecord = row.organization_roles.map((role) => role.role_type);
          const needsPhysicalLocation = rolesForRecord.some((role) => ["cafe", "roaster"].includes(role));
          const isCommercialOnly = rolesForRecord.some((role) => ["seller", "equipment_supplier"].includes(role));
          const hasContactRoute = Boolean(row.website_url?.trim() || row.phone?.trim() || row.email?.trim());
          return !locationCounts.get(row.id) && (needsPhysicalLocation || (isCommercialOnly && !hasContactRoute));
        }).map((row) => ({ id: `location-${row.id}`, entity: "organizations", entityId: row.id, label: row.name_ar, reason: row.organization_roles.some((role) => ["cafe", "roaster"].includes(role.role_type)) ? "مقهى أو محمصة منشورة بلا فرع جغرافي منشور أو قابل للمراجعة" : "جهة تجارية منشورة بلا فرع أو وسيلة تواصل قابلة للمراجعة", severity: "high" })),
      ],
      mediaBacklog: [
        ...publishedProducts.filter((row) => !mediaKeys.has(`products:${row.id}`)).map((row) => ({ entity: "products", id: row.id, label: row.name_ar, kind: "بطاقة المنتج الرئيسية" })),
        ...publishedOffers.filter((row) => !mediaKeys.has(`offers:${row.id}`)).map((row) => ({ entity: "offers", id: row.id, label: `${row.products?.name_ar || "منتج"} — ${row.organizations?.name_ar || "بائع"}`, kind: "عرض البائع" })),
      ],
    },
    supportWorkspace: { requests: supportRequests.map((request) => ({ ...request, history: supportHistory.filter((event) => event.entity_id === request.id) })), staff: staffProfiles },
    searchGovernance: {
      terms: searchTerms,
      weakQueries,
      totalEventsReviewed: searchEvents.length,
      activeTerms: searchTerms.filter((term) => term.status === "active").length,
      draftTerms: searchTerms.filter((term) => term.status === "draft").length,
    },
  };
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const data = await loadQueue(admin.token);
    return Response.json({ authenticated: true, profile: admin.profile, ...data });
  } catch (error) {
    console.error("admin-review", error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}

const allowedTables = ["products", "brands", "organizations", "offers", "contents", "origin_claims", "beta_feedback", "support_requests"] as const;
const publicationStatuses = ["draft", "in_review", "published", "rejected", "archived"];
const feedbackStatuses = ["new", "triaged", "in_progress", "resolved", "duplicate"];
const supportStatuses = ["new", "triaged", "in_progress", "waiting_user", "resolved", "closed", "spam", "archived"];
const searchTermStatuses = ["draft", "active", "retired"];
const searchIntents = ["broad", "product", "organization", "content", "origin"] as const;
const searchEntityTypes = ["product", "organization", "content", "origin"] as const;
const searchSourceBases = ["platform_decision", "industry_reference", "observed_query"] as const;
const qualityEntityTables = ["products", "brands", "organizations", "offers", "contents", "origin_claims"] as const;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ updated: false }, { status: 403 });
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ updated: false }, { status: 401 });
  const body = (await request.json().catch(() => null)) as
    | { table?: string; id?: string; status?: string; action?: string; canonicalTermAr?: string; canonicalTermEn?: string; aliases?: string[]; intent?: string; entityScope?: string[]; matchMode?: string; weight?: number; sourceBasis?: string; priority?: string; assignedTo?: string | null; internalNotes?: string; resolutionNote?: string; technicalReference?: string; overrideReason?: string; targetEntity?: string; targetId?: string }
    | null;
  const canVerify = ["verifier", "admin"].includes(admin.profile.role);
  const isOwnerAdmin = admin.profile.role === "admin";
  if (body?.action === "process_quality_issue") {
    if (!canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    const nextStatus = String(body.status || "");
    const note = String(body.resolutionNote || "").trim().slice(0, 2000);
    const targetEntity = qualityEntityTables.includes(body.targetEntity as (typeof qualityEntityTables)[number]) ? body.targetEntity as (typeof qualityEntityTables)[number] : null;
    const targetId = body.targetId && /^[0-9a-f-]{36}$/i.test(body.targetId) ? body.targetId : null;
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !["open", "accepted", "fixed", "dismissed"].includes(nextStatus) || (nextStatus !== "open" && note.length < 10) || ((targetEntity && !targetId) || (!targetEntity && targetId))) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<Array<Record<string, unknown>>>(admin.token, `data_quality_issues?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    if (targetEntity && targetId) {
      const target = await adminRest<Array<{ id: string }>>(admin.token, `${targetEntity}?select=id&id=eq.${targetId}&limit=1`);
      if (!target[0]) return Response.json({ updated: false, reason: "target_not_found" }, { status: 404 });
    }
    const resolved = nextStatus !== "open";
    const after = { entity_table: targetEntity || existing[0].entity_table || null, entity_id: targetId || existing[0].entity_id || null, status: nextStatus, resolution_note: note || null, resolved_by: resolved ? admin.user.id : null, resolved_at: resolved ? new Date().toISOString() : null };
    await adminRest(admin.token, `data_quality_issues?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(after) });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: `process_quality_issue_${nextStatus}`, entity_table: "data_quality_issues", entity_id: body.id, before_data: existing[0], after_data: after, source: "quality_desk" }) });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "create_search_term") {
    const canonicalTermAr = String(body.canonicalTermAr || "").trim().slice(0, 120);
    const canonicalTermEn = String(body.canonicalTermEn || "").trim().slice(0, 120) || null;
    const normalizedTerm = normalizeSearchText(canonicalTermAr);
    const intent = searchIntents.includes(body.intent as (typeof searchIntents)[number])
      ? body.intent as (typeof searchIntents)[number]
      : null;
    const aliases = Array.isArray(body.aliases)
      ? body.aliases.map((alias) => String(alias).trim().slice(0, 120)).filter((alias, index, list) => alias.length >= 2 && list.indexOf(alias) === index).slice(0, 30)
      : [];
    const entityScope = Array.isArray(body.entityScope)
      ? body.entityScope.filter((type): type is SearchEntityType => searchEntityTypes.includes(type as SearchEntityType))
      : [];
    if (normalizedTerm.length < 2 || !intent || entityScope.length < 1) {
      return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    }
    const created = await adminRest<SearchTermAdminRow[]>(admin.token, "search_terms?select=*", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=representation" },
      body: JSON.stringify({
        market_code: "IQ-BGD",
        canonical_term_ar: canonicalTermAr,
        canonical_term_en: canonicalTermEn,
        normalized_term: normalizedTerm,
        aliases,
        intent,
        entity_scope: entityScope,
        match_mode: ["exact", "prefix", "contains"].includes(body.matchMode || "") ? body.matchMode : "contains",
        weight: Math.max(1, Math.min(100, Number(body.weight) || 50)),
        source_basis: searchSourceBases.includes(body.sourceBasis as (typeof searchSourceBases)[number]) ? body.sourceBasis : "observed_query",
        notes_ar: "أضيف من لوحة حوكمة البحث ويحتاج إلى اعتماد بشري قبل التفعيل.",
        status: "draft",
        updated_by: admin.user.id,
      }),
    });
    const createdRow = created[0];
    if (!createdRow) return Response.json({ updated: false, reason: "upstream_error" }, { status: 502 });
    await adminRest(admin.token, "audit_events", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ actor_user_id: admin.user.id, action: "create_search_term_draft", entity_table: "search_terms", entity_id: createdRow.id, after_data: createdRow, source: "operations_ui" }),
    });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "set_search_term_status") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !searchTermStatuses.includes(body.status || "")) {
      return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    }
    const existing = await adminRest<SearchTermAdminRow[]>(admin.token, `search_terms?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    if (body.status === "active" && !canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    await adminRest(admin.token, `search_terms?id=eq.${body.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: body.status, updated_by: admin.user.id }),
    });
    await adminRest(admin.token, "audit_events", {
      method: "POST",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ actor_user_id: admin.user.id, action: `set_search_term_${body.status}`, entity_table: "search_terms", entity_id: body.id, before_data: { status: existing[0].status }, after_data: { status: body.status }, source: "operations_ui" }),
    });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "delete_search_term") {
    if (!isOwnerAdmin) return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<SearchTermAdminRow[]>(admin.token, `search_terms?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    if (existing[0].status === "active") return Response.json({ updated: false, reason: "active_term_cannot_be_deleted" }, { status: 409 });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "delete_search_term", entity_table: "search_terms", entity_id: body.id, before_data: existing[0], source: "operations_center_v4" }) });
    await adminRest(admin.token, `search_terms?id=eq.${body.id}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "update_search_term") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<SearchTermAdminRow[]>(admin.token, `search_terms?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    const canonicalTermAr = String(body.canonicalTermAr || "").trim().slice(0, 120);
    const canonicalTermEn = String(body.canonicalTermEn || "").trim().slice(0, 120) || null;
    const normalizedTerm = normalizeSearchText(canonicalTermAr);
    const intent = searchIntents.includes(body.intent as (typeof searchIntents)[number]) ? body.intent : null;
    const aliases = Array.isArray(body.aliases) ? body.aliases.map((value) => String(value).trim().slice(0, 120)).filter((value, index, list) => value.length >= 2 && list.indexOf(value) === index).slice(0, 30) : [];
    const entityScope = Array.isArray(body.entityScope) ? body.entityScope.filter((value): value is SearchEntityType => searchEntityTypes.includes(value as SearchEntityType)) : [];
    const matchMode = ["exact", "prefix", "contains"].includes(body.matchMode || "") ? body.matchMode : "contains";
    const weight = Math.max(1, Math.min(100, Number(body.weight) || 50));
    if (normalizedTerm.length < 2 || !intent || !entityScope.length) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const after = { canonical_term_ar: canonicalTermAr, canonical_term_en: canonicalTermEn, normalized_term: normalizedTerm, aliases, intent, entity_scope: entityScope, match_mode: matchMode, weight, source_basis: searchSourceBases.includes(body.sourceBasis as (typeof searchSourceBases)[number]) ? body.sourceBasis : existing[0].source_basis, updated_by: admin.user.id };
    await adminRest(admin.token, `search_terms?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(after) });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "update_search_term", entity_table: "search_terms", entity_id: body.id, before_data: existing[0], after_data: after, source: "operations_center_v2" }) });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "update_support_request") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !supportStatuses.includes(body.status || "") || !["low", "normal", "high", "urgent"].includes(body.priority || "")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<Array<Record<string, unknown>>>(admin.token, `support_requests?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
    const after = { status: body.status, priority: body.priority, assigned_to: body.assignedTo && /^[0-9a-f-]{36}$/i.test(body.assignedTo) ? body.assignedTo : null, internal_notes: String(body.internalNotes || "").trim().slice(0, 4000) || null, resolution_note: String(body.resolutionNote || "").trim().slice(0, 4000) || null, technical_reference: String(body.technicalReference || "").trim().slice(0, 300) || null, resolved_at: ["resolved", "closed", "archived"].includes(body.status || "") ? (existing[0].resolved_at || new Date().toISOString()) : null, archived_at: body.status === "archived" ? new Date().toISOString() : null };
    await adminRest(admin.token, `support_requests?id=eq.${body.id}`, { method: "PATCH", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(after) });
    await adminRest(admin.token, "audit_events", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ actor_user_id: admin.user.id, action: "process_support_request", entity_table: "support_requests", entity_id: body.id, before_data: existing[0], after_data: after, source: "operations_center_v2" }) });
    return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
  }
  if (body?.action === "delete_support_request") {
    if (!isOwnerAdmin) return Response.json({ updated:false,reason:"admin_required" },{status:403});
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated:false,reason:"invalid_input" },{status:400});
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, `support_requests?select=*&id=eq.${body.id}&status=eq.archived&limit=1`);
    if (!existing[0]) return Response.json({ updated:false,reason:"archived_request_required" },{status:409});
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:"delete_archived_support_request",entity_table:"support_requests",entity_id:body.id,before_data:existing[0],after_data:{deleted:true},source:"support_desk"})});
    await adminRest(admin.token,`support_requests?id=eq.${body.id}`,{method:"DELETE",headers:{prefer:"return=minimal"}});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }
  if (body?.action === "mark_support_escalated" || body?.action === "mark_support_reply") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated:false,reason:"invalid_input" },{status:400});
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, `support_requests?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated:false,reason:"not_found" },{status:404});
    if (body.action === "mark_support_reply" && (!String(existing[0].requester_phone || "").trim() || String(existing[0].resolution_note || "").trim().length < 3)) return Response.json({ updated:false,reason:"contact_or_resolution_missing" },{status:409});
    const field = body.action === "mark_support_escalated" ? "escalated_at" : "customer_replied_at";
    const after = { [field]: new Date().toISOString() };
    await adminRest(admin.token,`support_requests?id=eq.${body.id}`,{method:"PATCH",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(after)});
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:body.action,entity_table:"support_requests",entity_id:body.id,after_data:after,source:"support_desk"})});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }
  if (body?.action === "delete_catalog_record") {
    if (!isOwnerAdmin) return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
    if (!body.table || !["products","brands","organizations","offers","contents","origin_claims"].includes(body.table) || !body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      const media = await adminRest<Array<{ storage_path: string }>>(admin.token, `entity_media?select=storage_path&entity_table=eq.${body.table}&entity_id=eq.${body.id}`);
      await adminRest(admin.token, "rpc/admin_delete_catalog_record", { method: "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ p_entity_table: body.table, p_entity_id: body.id }) });
      if (SUPABASE_URL && SUPABASE_KEY) for (const item of media) await fetch(`${SUPABASE_URL}/storage/v1/object/public-media/${item.storage_path}`, { method:"DELETE",headers:{apikey:SUPABASE_KEY,authorization:`Bearer ${admin.token}`} }).catch(()=>null);
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return Response.json({ updated: false, reason: message.includes("published_record") ? "published_record_cannot_be_deleted" : message.includes("23503") ? "record_has_dependencies" : "delete_failed" }, { status: 409 });
    }
  }
  if (body?.action === "process_rights_request") {
    if (!canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    const next = String(body.status || "");
    const final = ["approved","rejected","closed"].includes(next);
    const note = String(body.resolutionNote || "").trim().slice(0,4000);
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !["needs_evidence","in_review","approved","rejected","closed"].includes(next) || (final && note.length < 10)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const existing = await adminRest<Array<Record<string,unknown>>>(admin.token, `rights_requests?select=*&id=eq.${body.id}&limit=1`);
    if (!existing[0]) return Response.json({ updated:false,reason:"not_found" },{status:404});
    const after = { status: next, resolution_note: note || null, assigned_to: admin.user.id, closed_at: final ? new Date().toISOString() : null };
    await adminRest(admin.token, `rights_requests?id=eq.${body.id}`, { method:"PATCH",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify(after) });
    await adminRest(admin.token,"audit_events",{method:"POST",headers:{"content-type":"application/json",prefer:"return=minimal"},body:JSON.stringify({actor_user_id:admin.user.id,action:`process_rights_${next}`,entity_table:"rights_requests",entity_id:body.id,before_data:existing[0],after_data:after,source:"operations_center_v5"})});
    return Response.json({ updated:true,...(await loadQueue(admin.token)) });
  }
  if (
    !body?.table ||
    !allowedTables.includes(body.table as (typeof allowedTables)[number]) ||
    !body.id ||
    !/^[0-9a-f-]{36}$/i.test(body.id) ||
    !body.status ||
    (body.table === "beta_feedback"
      ? !feedbackStatuses.includes(body.status)
      : body.table === "support_requests"
        ? !supportStatuses.includes(body.status)
        : !publicationStatuses.includes(body.status))
  ) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });

  const table = body.table as (typeof allowedTables)[number];
  if (["published", "rejected", "archived"].includes(body.status) && !canVerify)
    return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
  const rows = await adminRest<Array<Record<string, unknown>>>(
    admin.token,
    `${table}?select=*&id=eq.${body.id}&limit=1`,
  );
  const row = rows[0];
  if (!row) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
  if (body.status === "published") {
    const data = await loadQueue(admin.token);
    const queueKey = table === "origin_claims" ? "origins" : table;
    const readiness = data.queues[queueKey]?.find((candidate) => candidate.id === body.id);
    const overrideReason = String(body.overrideReason || "").trim().slice(0, 1000);
    if (!readiness?.ready && overrideReason.length < 10)
      return Response.json({ updated: false, reason: "publish_requirements", blockers: readiness?.blockers || [] }, { status: 409 });
  }

  await adminRest(admin.token, `${table}?id=eq.${body.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ status: body.status }),
  });
  if (table === "organizations" && ["draft", "in_review", "published", "rejected", "archived"].includes(body.status)) {
    await adminRest(admin.token, `locations?organization_id=eq.${body.id}&status=neq.archived`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ status: body.status }),
    });
  }
  await adminRest(admin.token, "audit_events", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({
      actor_user_id: admin.user.id,
      action: body.status === "published" && body.overrideReason ? "admin_publish_override" : `admin_set_${body.status}`,
      entity_table: table,
      entity_id: body.id,
      before_data: { status: row.status },
      after_data: { status: body.status, override_reason: body.overrideReason || null },
      source: "operations_ui",
    }),
  });
  return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
}
