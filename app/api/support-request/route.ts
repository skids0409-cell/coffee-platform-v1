import { sameOrigin } from "@/lib/supabase-admin";
import { isSupabaseConfigured, supabaseRestInsert } from "@/lib/supabase-rest";

const allowedTypes = new Set([
  "platform_issue",
  "incorrect_information",
  "missing_listing",
  "search_issue",
  "suggestion",
  "business",
  "other",
]);
const allowedChannels = new Set(["whatsapp", "platform"]);
const attempts = new Map<string, number[]>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function rateLimited(request: Request) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 6) return true;
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ accepted: false }, { status: 403 });
  if (!isSupabaseConfigured()) return Response.json({ accepted: false, reason: "not_configured" }, { status: 503 });
  if (rateLimited(request)) return Response.json({ accepted: false, reason: "rate_limited" }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ accepted: false, reason: "invalid_json" }, { status: 400 });
  if (clean(body.website, 200)) return Response.json({ accepted: true }, { status: 202 });

  const requestType = clean(body.requestType, 40);
  const pagePath = clean(body.pagePath, 500);
  const subject = clean(body.subject, 160);
  const message = clean(body.message, 4000);
  const preferredChannel = clean(body.preferredChannel, 20) || "whatsapp";
  const requesterName = clean(body.requesterName, 160);
  const requesterPhone = clean(body.requesterPhone, 40).replace(/[^0-9+]/g, "");
  const requesterEmail = clean(body.requesterEmail, 200);
  if (
    !allowedTypes.has(requestType) ||
    !pagePath.startsWith("/") ||
    subject.length < 4 ||
    message.length < 10 ||
    requesterName.length < 2 ||
    (preferredChannel === "whatsapp" && requesterPhone.replace(/\D/g, "").length < 8) ||
    !allowedChannels.has(preferredChannel) ||
    body.consent !== true
  ) return Response.json({ accepted: false, reason: "validation_failed" }, { status: 422 });

  const reference = `SR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    await supabaseRestInsert("support_requests", {
      public_reference: reference,
      request_type: requestType,
      page_path: pagePath,
      subject,
      message,
      requester_name: requesterName,
      requester_phone: requesterPhone || null,
      requester_email: requesterEmail || null,
      preferred_channel: preferredChannel,
      consent: true,
      status: "new",
    });
    return Response.json({ accepted: true, reference });
  } catch (error) {
    console.error("support-request", error instanceof Error ? error.message : "unknown");
    return Response.json({ accepted: false, reason: "upstream_error" }, { status: 502 });
  }
}
