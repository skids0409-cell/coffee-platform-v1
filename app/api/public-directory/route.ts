import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type PublicOrganization = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  website_url: string | null;
  phone: string | null;
  logo_url: string | null;
  verification_tier: string;
  status: "published";
  source_checked_at: string | null;
  media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
  organization_roles: Array<{ role_type: string; is_primary: boolean }>;
  locations: Array<{ id: string; name_ar: string | null; address_ar: string; district_ar: string | null; status: "published" }>;
};

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ connected: false, organizations: [] }, { status: 503 });
  }

  try {
    const organizations = await supabaseRest<Omit<PublicOrganization, "media">[]>(
      "organizations?select=id,slug,name_ar,name_en,description_ar,website_url,phone,logo_url,verification_tier,status,source_checked_at,organization_roles(role_type,is_primary),locations(id,name_ar,address_ar,district_ar,status)&status=eq.published&order=name_ar.asc",
    );
    const media = organizations.length ? await supabaseRest<Array<{ id: string; entity_id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>>(`entity_media?select=id,entity_id,url,alt_ar,is_primary,sort_order&entity_table=eq.organizations&entity_id=in.(${organizations.map((organization) => organization.id).join(",")})&order=is_primary.desc,sort_order.asc`) : [];
    return Response.json({ connected: true, organizations: organizations.map((organization) => ({ ...organization, media: media.filter((item) => item.entity_id === organization.id).map((item) => ({ id:item.id,url:item.url,alt_ar:item.alt_ar,is_primary:item.is_primary,sort_order:item.sort_order })) })) });
  } catch (error) {
    console.error("public-directory", error);
    return Response.json({ connected: false, organizations: [] }, { status: 502 });
  }
}
