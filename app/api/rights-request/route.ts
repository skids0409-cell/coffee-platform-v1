import {
  isSupabaseConfigured,
  SupabaseConfigurationError,
  supabaseRestInsert,
} from "@/lib/supabase-rest";

const allowedTypes = new Set([
  "correction",
  "removal",
  "objection",
  "privacy",
  "listing_claim",
]);
const rateWindowMs = 10 * 60 * 1000;
const rateLimit = 4;
const attempts = new Map<string, number[]>();

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(
    (timestamp) => now - timestamp < rateWindowMs,
  );
  if (recent.length >= rateLimit) return true;
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json(
      { accepted: false, reason: "not_configured" },
      { status: 503 },
    );
  }

  if (isRateLimited(getClientKey(request))) {
    return Response.json(
      { accepted: false, reason: "rate_limited" },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json(
      { accepted: false, reason: "invalid_json" },
      { status: 400 },
    );
  }

  if (clean(body.website, 200)) {
    return Response.json({ accepted: true }, { status: 202 });
  }

  const requestType = clean(body.requestType, 40);
  const requesterName = clean(body.name, 120);
  const requesterEmail = clean(body.email, 254).toLowerCase();
  const requesterPhone = clean(body.phone, 40);
  const targetReference = clean(body.target, 500);
  const evidenceReference = clean(body.evidenceReference, 1000);
  const details = clean(body.details, 5000);
  const consentToContact = body.consent === true;

  if (
    !allowedTypes.has(requestType) ||
    requesterName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail) ||
    details.length < 20 ||
    (requestType !== "privacy" && targetReference.length < 3) ||
    !consentToContact
  ) {
    return Response.json(
      { accepted: false, reason: "validation_failed" },
      { status: 422 },
    );
  }

  const publicReference = `RR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

  try {
    await supabaseRestInsert("rights_requests", {
      public_reference: publicReference,
      request_type: requestType,
      submitted_by: null,
      requester_name: requesterName,
      requester_email: requesterEmail,
      requester_phone: requesterPhone || null,
      target_reference_text: targetReference || null,
      evidence_reference: evidenceReference || null,
      details,
      consent_to_contact: true,
    });
    return Response.json({ accepted: true, reference: publicReference });
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return Response.json(
        { accepted: false, reason: "not_configured" },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "unknown";
    console.error("rights-request", message);
    const schemaMissing =
      message.includes("target_reference_text") || message.includes("PGRST204");
    return Response.json(
      {
        accepted: false,
        reason: schemaMissing ? "schema_upgrade_required" : "upstream_error",
      },
      { status: schemaMissing ? 503 : 502 },
    );
  }
}
