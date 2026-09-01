import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type PublicOriginCountry = {
  code: string;
  name_ar: string;
  name_en: string;
  coffee_regions: Array<{
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    altitude_min_m: number | null;
    altitude_max_m: number | null;
    origin_claims: Array<{
      process_code: string | null;
      variety_codes: string[];
      harvest_label: string | null;
      products: {
        slug: string;
        name_ar: string;
        summary_ar: string | null;
        product_kind: string;
      } | null;
    }>;
  }>;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { connected: false, countries: [], reason: "not_configured" },
      { status: 503 },
    );
  }

  try {
    const select = [
      "code",
      "name_ar",
      "name_en",
      "coffee_regions(id,slug,name_ar,name_en,altitude_min_m,altitude_max_m,origin_claims(process_code,variety_codes,harvest_label,products(slug,name_ar,summary_ar,product_kind)))",
    ].join(",");
    const countries = await supabaseRest<PublicOriginCountry[]>(
      `countries?select=${encodeURIComponent(select)}&status=eq.published&order=name_ar.asc`,
    );
    return Response.json({ connected: true, countries });
  } catch (error) {
    console.error("public-origins", error);
    return Response.json(
      { connected: false, countries: [], reason: "upstream_error" },
      { status: 502 },
    );
  }
}
