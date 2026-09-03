import { requireStaff } from "@/lib/supabase-admin";
import { isProductKind } from "@/lib/record-capability-types";
import { loadRecordCapability } from "@/lib/record-capabilities";

const validId = (value: string | null) => !value || /^[0-9a-f-]{36}$/i.test(value);

export async function GET(request: Request) {
  const staff = await requireStaff(request).catch(() => null);
  if (!staff) return Response.json({ authenticated: false }, { status: 401 });
  const url = new URL(request.url);
  const productKind = url.searchParams.get("productKind");
  const modeValue = url.searchParams.get("mode") || "create";
  const recordId = url.searchParams.get("recordId");
  if (!isProductKind(productKind) || !["create", "edit", "review"].includes(modeValue) || !validId(recordId)) return Response.json({ reason: "invalid_input" }, { status: 400 });
  try {
    const contract = await loadRecordCapability(staff.token, productKind, modeValue as "create" | "edit" | "review", recordId);
    return Response.json({ authenticated: true, contract }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "upstream_error";
    return Response.json({ reason }, { status: reason === "record_kind_mismatch" ? 409 : 502 });
  }
}
