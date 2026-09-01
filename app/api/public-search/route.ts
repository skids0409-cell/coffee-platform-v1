import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import {
  buildSearchPlan,
  expandArabicStorageVariants,
  normalizeSearchText,
  rankSearchText,
  type SearchEntityType,
  type SearchRequestType,
  type SearchRule,
} from "@/lib/search-governance";

type SearchResult = {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle: string;
  href: string;
};

const allowedTypes = new Set<SearchRequestType>([
  "smart",
  "all",
  "product",
  "organization",
  "content",
  "origin",
]);

function searchableFilter(fields: string[], terms: string[]) {
  const clauses = fields.flatMap((field) =>
    terms.map((term) => `${field}.ilike.${encodeURIComponent(`*${term}*`)}`),
  );
  return `or=(${clauses.join(",")})`;
}

function countResults(results: SearchResult[]) {
  return results.reduce<Record<SearchEntityType, number>>(
    (counts, result) => ({ ...counts, [result.type]: counts[result.type] + 1 }),
    { product: 0, organization: 0, content: 0, origin: 0 },
  );
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { connected: false, results: [], reason: "not_configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const rawQuery = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const query = normalizeSearchText(rawQuery);
  const rawType = url.searchParams.get("type") || "smart";
  const requestedType = allowedTypes.has(rawType as SearchRequestType)
    ? rawType as SearchRequestType
    : "smart";
  if (query.length < 2) {
    return Response.json({ connected: true, results: [], query });
  }

  try {
    const rules = await supabaseRest<SearchRule[]>(
      "search_terms?select=id,canonical_term_ar,canonical_term_en,normalized_term,aliases,intent,entity_scope,match_mode,weight&market_code=eq.IQ-BGD&status=eq.active&order=weight.desc&limit=200",
    );
    const plan = buildSearchPlan(query, requestedType, rules);
    const terms = Array.from(
      new Set([
        rawQuery,
        ...expandArabicStorageVariants(query),
        ...plan.searchTerms.flatMap((term) => expandArabicStorageVariants(term)),
      ]),
    ).slice(0, 32);
    const includes = (type: SearchEntityType) => plan.searchedTypes.includes(type);

    const [organizations, products, contents, countries, regions] = await Promise.all([
      includes("organization")
        ? supabaseRest<Array<Record<string, string | null>>>(
            `organizations?select=id,slug,name_ar,name_en,description_ar,verification_tier&status=eq.published&${searchableFilter(["name_ar", "name_en", "description_ar"], terms)}&limit=16`,
          )
        : Promise.resolve([]),
      includes("product")
        ? supabaseRest<Array<Record<string, string | null>>>(
            `products?select=id,slug,name_ar,name_en,summary_ar,product_kind,verification_tier&status=eq.published&${searchableFilter(["name_ar", "name_en", "summary_ar", "model_number"], terms)}&limit=16`,
          )
        : Promise.resolve([]),
      includes("content")
        ? supabaseRest<Array<Record<string, string | null>>>(
            `contents?select=id,slug,title_ar,title_en,excerpt_ar,type&status=eq.published&${searchableFilter(["title_ar", "title_en", "excerpt_ar"], terms)}&limit=16`,
          )
        : Promise.resolve([]),
      includes("origin")
        ? supabaseRest<Array<Record<string, string | null>>>(
            `countries?select=code,name_ar,name_en&status=eq.published&${searchableFilter(["name_ar", "name_en"], terms)}&limit=12`,
          )
        : Promise.resolve([]),
      includes("origin")
        ? supabaseRest<Array<Record<string, string | null>>>(
            `coffee_regions?select=id,slug,name_ar,name_en,country_code&status=eq.published&${searchableFilter(["name_ar", "name_en"], terms)}&limit=12`,
          )
        : Promise.resolve([]),
    ]);

    const rankedResults: SearchResult[] = [
      ...organizations.map((row) => ({
        id: String(row.id),
        type: "organization" as const,
        title: String(row.name_ar),
        subtitle: row.description_ar || row.name_en || "جهة قهوة منشورة",
        href: `/directory/${row.slug}`,
      })),
      ...products.map((row) => ({
        id: String(row.id),
        type: "product" as const,
        title: String(row.name_ar),
        subtitle: row.summary_ar || row.name_en || "منتج منشور",
        href: row.product_kind === "roasted_coffee" ? `/coffee/${row.slug}` : `/equipment/${row.slug}`,
      })),
      ...contents.map((row) => ({
        id: String(row.id),
        type: "content" as const,
        title: String(row.title_ar),
        subtitle: row.excerpt_ar || row.title_en || "محتوى معرفي منشور",
        href: `/knowledge/${row.slug}`,
      })),
      ...countries.map((row) => ({
        id: String(row.code),
        type: "origin" as const,
        title: String(row.name_ar),
        subtitle: row.name_en || "دولة منشأ منشورة",
        href: `/origins/${String(row.name_en || row.code).toLowerCase().replace(/\s+/g, "-")}`,
      })),
      ...regions.map((row) => ({
        id: String(row.id),
        type: "origin" as const,
        title: String(row.name_ar),
        subtitle: row.name_en || `منطقة قهوة · ${row.country_code}`,
        href: `/origins/${String(row.country_code).toLowerCase()}/${row.slug}`,
      })),
    ].sort(
      (a, b) =>
        rankSearchText(query, b.title, b.subtitle, terms) -
        rankSearchText(query, a.title, a.subtitle, terms),
    );
    // Full names are navigational queries. Prefer the direct title over broad
    // dictionary aliases such as «مطحنة» that can pull unrelated products.
    const exactTitleResults = rankedResults.filter((result) => normalizeSearchText(result.title) === query);
    const prefixTitleResults = rankedResults.filter((result) => normalizeSearchText(result.title).startsWith(query));
    const results = exactTitleResults.length ? exactTitleResults : prefixTitleResults.length ? prefixTitleResults : rankedResults;

    return Response.json({
      connected: true,
      query,
      requestedType,
      intent: plan.intent,
      searchedTypes: plan.searchedTypes,
      matchedTerm: plan.matchedTerm,
      explanation: plan.explanation,
      resultCounts: countResults(results),
      results,
    });
  } catch (error) {
    console.error("public-search", error);
    return Response.json(
      { connected: false, results: [], reason: "upstream_error" },
      { status: 502 },
    );
  }
}
