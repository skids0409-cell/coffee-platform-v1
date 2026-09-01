import { sameOrigin } from "@/lib/supabase-admin";
import {
  isSupabaseConfigured,
  supabaseRestInsert,
} from "@/lib/supabase-rest";
import {
  normalizeSearchText,
  type SearchEntityType,
  type SearchRequestType,
} from "@/lib/search-governance";

const allowedIntents = new Set([
  "broad",
  "product",
  "organization",
  "content",
  "origin",
  "unknown",
]);
const allowedTypes = new Set<SearchRequestType>([
  "smart",
  "all",
  "product",
  "organization",
  "content",
  "origin",
]);

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ recorded: false, reason: "origin" }, { status: 403 });
  }
  if (!isSupabaseConfigured()) {
    return Response.json(
      { recorded: false, reason: "not_configured" },
      { status: 503 },
    );
  }
  const body = (await request.json().catch(() => null)) as {
    query?: string;
    intent?: string;
    requestedType?: string;
    resultCount?: number;
    resultCounts?: Partial<Record<SearchEntityType, number>>;
    reviewMode?: boolean;
  } | null;
  const query = normalizeSearchText(body?.query || "");
  const intent = allowedIntents.has(body?.intent || "") ? body?.intent : "unknown";
  const requestedType = allowedTypes.has(body?.requestedType as SearchRequestType)
    ? body?.requestedType
    : "smart";
  const resultCount = Number.isInteger(body?.resultCount)
    ? Math.max(0, Math.min(1000, Number(body?.resultCount)))
    : 0;
  if (query.length < 2 || query.length > 80) {
    return Response.json({ recorded: false, reason: "invalid_input" }, { status: 400 });
  }
  const resultCounts = Object.fromEntries(
    (["product", "origin", "content", "organization"] as SearchEntityType[]).map(
      (type) => [type, Math.max(0, Math.min(1000, Number(body?.resultCounts?.[type]) || 0))],
    ),
  );
  try {
    await supabaseRestInsert("search_query_events", {
      market_code: "IQ-BGD",
      normalized_query: query,
      inferred_intent: intent,
      requested_type: requestedType,
      result_count: resultCount,
      result_counts: resultCounts,
      is_review_mode: Boolean(body?.reviewMode),
    });
    return Response.json({ recorded: true }, { status: 201 });
  } catch (error) {
    console.error("search-event", error);
    return Response.json(
      { recorded: false, reason: "upstream_error" },
      { status: 502 },
    );
  }
}
