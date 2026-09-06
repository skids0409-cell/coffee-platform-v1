import { requireStaff, adminRest } from "@/lib/supabase-admin";
import { isEntityTypeAllowed, projectEntityLinkingContract, type EntityResolverContext, type EntityTypeKey } from "@/lib/entity-linking-contract";

type ResolverOption = { id: string; label: string; secondaryLabel: string | null; status: string | null };

type NamedRow = { id: string; name_ar?: string | null; name_en?: string | null; title_ar?: string | null; title_en?: string | null; slug?: string | null; status?: string | null };
type OfferRow = { id: string; status?: string | null; product?: { name_ar?: string | null; name_en?: string | null } | null; seller?: { name_ar?: string | null; name_en?: string | null } | null };
type OriginRow = { id: string; farm_or_producer_name?: string | null; lot_reference?: string | null; product?: { name_ar?: string | null; name_en?: string | null } | null };
type TechnicalTaskRow = { id: string; task_code: string; title: string; status: string };

const allowedContexts = new Set<EntityResolverContext>(["media_pending_review", "support_technical_reference"]);

function normalize(value: unknown) {
  return String(value || "").trim().toLocaleLowerCase("ar-IQ");
}

function nameLabel(row: NamedRow) {
  return row.name_ar || row.title_ar || row.name_en || row.title_en || row.slug || "سجل بدون تسمية";
}

async function loadOptions(token: string, entityType: EntityTypeKey): Promise<ResolverOption[]> {
  if (entityType === "products" || entityType === "organizations" || entityType === "brands") {
    const rows = await adminRest<NamedRow[]>(token, `${entityType}?select=id,name_ar,name_en,slug,status&status=neq.archived&order=updated_at.desc&limit=100`);
    return rows.map((row) => ({ id: row.id, label: nameLabel(row), secondaryLabel: row.name_en || row.slug || null, status: row.status || null }));
  }
  if (entityType === "contents") {
    const rows = await adminRest<NamedRow[]>(token, "contents?select=id,title_ar,title_en,slug,status&status=neq.archived&order=updated_at.desc&limit=100");
    return rows.map((row) => ({ id: row.id, label: nameLabel(row), secondaryLabel: row.title_en || row.slug || null, status: row.status || null }));
  }
  if (entityType === "offers") {
    const rows = await adminRest<OfferRow[]>(token, "offers?select=id,status,product:products(name_ar,name_en),seller:organizations(name_ar,name_en)&status=neq.archived&order=updated_at.desc&limit=100");
    return rows.map((row) => ({
      id: row.id,
      label: `${row.product?.name_ar || row.product?.name_en || "منتج"} — ${row.seller?.name_ar || row.seller?.name_en || "جهة"}`,
      secondaryLabel: "عرض تجاري",
      status: row.status || null,
    }));
  }
  if (entityType === "technical_tasks") {
    const rows = await adminRest<TechnicalTaskRow[]>(token, "technical_tasks?select=id,task_code,title,status&status=neq.closed&order=updated_at.desc&limit=100");
    return rows.map((row) => ({
      id: row.id,
      label: `${row.task_code} — ${row.title}`,
      secondaryLabel: "مهمة تقنية معتمدة",
      status: row.status,
    }));
  }
  const rows = await adminRest<OriginRow[]>(token, "origin_claims?select=id,farm_or_producer_name,lot_reference,product:products(name_ar,name_en)&order=updated_at.desc&limit=100");
  return rows.map((row) => ({
    id: row.id,
    label: row.farm_or_producer_name || row.lot_reference || row.product?.name_ar || row.product?.name_en || "مصدر قهوة",
    secondaryLabel: row.product?.name_ar || row.product?.name_en || null,
    status: null,
  }));
}

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });

  const url = new URL(request.url);
  const context = String(url.searchParams.get("context") || "") as EntityResolverContext;
  const linkRole = url.searchParams.get("role");
  const entityType = String(url.searchParams.get("entityType") || "");
  const query = normalize(url.searchParams.get("q"));
  if (!allowedContexts.has(context)) return Response.json({ reason: "invalid_context" }, { status: 400 });

  const contract = projectEntityLinkingContract({ context, linkRole });
  if (!entityType) return Response.json({ contract, options: [] }, { headers: { "cache-control": "no-store" } });
  if (!isEntityTypeAllowed(contract, entityType)) return Response.json({ reason: "entity_type_not_allowed", contract }, { status: 400 });

  try {
    const options = (await loadOptions(admin.token, entityType)).filter((option) => {
      if (!query) return true;
      return normalize(`${option.label} ${option.secondaryLabel || ""}`).includes(query);
    }).slice(0, 50);
    return Response.json({ contract, options }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("entity-resolver-read", error instanceof Error ? error.message : error);
    return Response.json({ reason: "resolver_upstream_error", contract }, { status: 502 });
  }
}
