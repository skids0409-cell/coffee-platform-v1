import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type PublicContent = {
  id: string;
  slug: string;
  type: string;
  title_ar: string;
  title_en: string | null;
  excerpt_ar: string | null;
  body_ar: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  updated_at: string;
  content_topics: Array<{
    topics: { slug: string; name_ar: string; name_en: string } | null;
  }>;
  content_links: Array<{
    relation_type: string;
    products: { slug: string; name_ar: string; product_kind: string } | null;
    organizations: { slug: string; name_ar: string } | null;
    categories: { code: string; slug: string; name_ar: string } | null;
    countries: { code: string; name_ar: string } | null;
    coffee_regions: { slug: string; name_ar: string; country_code: string } | null;
  }>;
};

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { connected: false, contents: [], reason: "not_configured" },
      { status: 503 },
    );
  }
  const requested = new URL(request.url).searchParams.get("slug") || "";
  const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requested) ? requested : "";
  try {
    const select = [
      "id",
      "slug",
      "type",
      "title_ar",
      "title_en",
      "excerpt_ar",
      "body_ar",
      "hero_image_url",
      "published_at",
      "updated_at",
      "content_topics(topics(slug,name_ar,name_en))",
      "content_links(relation_type,products(slug,name_ar,product_kind),organizations(slug,name_ar),categories(code,slug,name_ar),countries(code,name_ar),coffee_regions(slug,name_ar,country_code))",
    ].join(",");
    const slugFilter = slug ? `&slug=eq.${encodeURIComponent(slug)}` : "";
    const contents = await supabaseRest<PublicContent[]>(
      `contents?select=${encodeURIComponent(select)}&status=eq.published${slugFilter}&order=published_at.desc.nullslast&limit=100`,
    );
    return Response.json({ connected: true, contents });
  } catch (error) {
    console.error("public-content", error);
    return Response.json(
      { connected: false, contents: [], reason: "upstream_error" },
      { status: 502 },
    );
  }
}
