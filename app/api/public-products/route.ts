import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

type PublicCategory = {
  id: string;
  code: string;
  slug: string;
  name_ar: string;
  name_en: string;
  comparison_group: string | null;
};

type CatalogCategory = PublicCategory & {
  parent_id: string | null;
  navigation_parent_id: string | null;
  is_navigation_visible: boolean;
  catalog_family_id: string | null;
  catalog_filter_id: string | null;
  catalog_product_kind: string | null;
  sort_order: number;
};

export type PublicProduct = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  summary_ar: string | null;
  description_ar: string | null;
  product_kind: string;
  model_number: string | null;
  verification_tier: string;
  source_checked_at: string | null;
  media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
  brands: {
    slug: string;
    name_ar: string;
    name_en: string | null;
  } | null;
  product_categories: Array<{
    is_primary: boolean;
    categories: PublicCategory | null;
  }>;
  offers: Array<{
    id: string;
    price: number | null;
    currency_code: string;
    availability: string;
    external_url: string;
    observed_at: string;
    media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
    organizations: {
      slug: string;
      name_ar: string;
      name_en: string | null;
    } | null;
  }>;
  product_attribute_values: Array<{
    value_text: string | null;
    value_integer: number | null;
    value_decimal: number | null;
    value_boolean: boolean | null;
    value_date: string | null;
    value_json: unknown;
    unit_code: string | null;
    field_definitions: {
      code: string;
      name_ar: string;
      name_en: string;
      unit_code: string | null;
    } | null;
  }>;
  roaster_specifications: {
    application: string[];
    heat_source: string | null;
    batch_min_kg: number | null;
    batch_max_kg: number | null;
    production_kg_per_hour: number | null;
    control_level: string | null;
    power_supply: string | null;
    gas_type: string | null;
    exhaust_requirements: string | null;
    dimensions_mm: Record<string, unknown>;
    weight_kg: number | null;
    warranty_months: number | null;
    source_checked_at: string;
  } | null;
};

const select = [
  "id",
  "slug",
  "name_ar",
  "name_en",
  "summary_ar",
  "description_ar",
  "product_kind",
  "model_number",
  "verification_tier",
  "source_checked_at",
  "brands(slug,name_ar,name_en)",
  "product_categories(is_primary,categories(id,code,slug,name_ar,name_en,comparison_group))",
  "offers(id,price,currency_code,availability,external_url,observed_at,organizations(slug,name_ar,name_en))",
  "product_attribute_values(value_text,value_integer,value_decimal,value_boolean,value_date,value_json,unit_code,field_definitions(code,name_ar,name_en,unit_code))",
  "roaster_specifications(application,heat_source,batch_min_kg,batch_max_kg,production_kg_per_hour,control_level,power_supply,gas_type,exhaust_requirements,dimensions_mm,weight_kg,warranty_months,source_checked_at)",
].join(",");

function safeSlug(value: string | null) {
  const slug = (value || "").trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : "";
}

function safeCategory(value: string | null) {
  const code = (value || "").trim().toUpperCase();
  return /^[A-Z0-9-]{3,50}$/.test(code) ? code : "";
}

function safeKind(value: string | null) {
  const kind = (value || "").trim().toLowerCase();
  return ["roasted_coffee", "equipment", "consumable", "care_product", "replacement_part"].includes(kind)
    ? kind
    : "";
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { connected: false, products: [], reason: "not_configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const slug = safeSlug(url.searchParams.get("slug"));
  const category = safeCategory(url.searchParams.get("category"));
  const navigationRoot = safeCategory(url.searchParams.get("navigationRoot")) || category;
  const kind = safeKind(url.searchParams.get("kind"));

  try {
    const slugFilter = slug ? `&slug=eq.${encodeURIComponent(slug)}` : "";
    const kindFilter = kind
      ? `&product_kind=eq.${encodeURIComponent(kind)}`
      : "";
    const [products, taxonomy] = await Promise.all([
      supabaseRest<PublicProduct[]>(
        `products?select=${encodeURIComponent(select)}&status=eq.published${slugFilter}${kindFilter}&order=name_ar.asc&limit=100`,
      ),
      supabaseRest<CatalogCategory[]>(
        "categories?select=id,code,slug,name_ar,name_en,comparison_group,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind,sort_order&status=eq.published&order=sort_order.asc,code.asc&limit=500",
      ),
    ]);
    const productMedia = products.length ? await supabaseRest<Array<{ id: string; entity_id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>>(`entity_media?select=id,entity_id,url,alt_ar,is_primary,sort_order&entity_table=eq.products&entity_id=in.(${products.map((product) => product.id).join(",")})&order=is_primary.desc,sort_order.asc`) : [];
    const offerIds = products.flatMap((product) => product.offers.map((offer) => offer.id));
    const offerMedia = offerIds.length ? await supabaseRest<Array<{ id: string; entity_id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>>(`entity_media?select=id,entity_id,url,alt_ar,is_primary,sort_order&entity_table=eq.offers&entity_id=in.(${offerIds.join(",")})&order=is_primary.desc,sort_order.asc`) : [];
    const withMedia = products.map((product) => ({
      ...product,
      media: productMedia.filter((item) => item.entity_id === product.id).map((item) => ({ id:item.id,url:item.url,alt_ar:item.alt_ar,is_primary:item.is_primary,sort_order:item.sort_order })),
      offers: product.offers.map((offer) => ({ ...offer, media: offerMedia.filter((item) => item.entity_id === offer.id).map((item) => ({ id:item.id,url:item.url,alt_ar:item.alt_ar,is_primary:item.is_primary,sort_order:item.sort_order })) })),
    }));
    const requestedCategory = taxonomy.find((item) => item.code === category);
    const isFamily = requestedCategory?.catalog_family_id === requestedCategory?.id
      && requestedCategory?.catalog_filter_id == null;
    const isVisibleFilter = requestedCategory?.catalog_filter_id === requestedCategory?.id;
    const taxonomyById = new Map(taxonomy.map((item) => [item.id, item]));
    const filtered = category
      ? withMedia.filter((product) => product.product_categories.some((relation) => {
          const assigned = relation.categories ? taxonomyById.get(relation.categories.id) : null;
          if (!assigned || !requestedCategory) return false;
          if (isFamily)
            return assigned.id === requestedCategory.id
              || assigned.catalog_family_id === requestedCategory.id;
          if (isVisibleFilter)
            return assigned.id === requestedCategory.id
              || assigned.catalog_filter_id === requestedCategory.id;
          return assigned.id === requestedCategory.id
            || assigned.code.startsWith(`${requestedCategory.code}-`);
        }))
      : withMedia;
    const navigationCategory = taxonomy.find((item) => item.code === navigationRoot);
    const categoryOptions = navigationCategory
      ? taxonomy.filter((item) =>
          item.is_navigation_visible
          && item.navigation_parent_id === navigationCategory.id,
        )
      : [];

    return Response.json(
      { connected: true, products: filtered, categoryOptions },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("public-products", error);
    return Response.json(
      { connected: false, products: [], reason: "upstream_error" },
      { status: 502 },
    );
  }
}
