import { sameOrigin } from "@/lib/supabase-admin";
import { isSupabaseConfigured, supabaseRestInsert } from "@/lib/supabase-rest";

const allowedTasks = new Set(["discover", "filter", "compare", "finder", "offer", "directory", "search", "admin", "other"]);
const allowedOutcomes = new Set(["success", "partial", "failed"]);
const allowedDevices = new Set(["android", "iphone", "desktop", "tablet", "other"]);
const allowedSeverities = new Set(["p0", "p1", "p2", "p3", "none"]);
const attempts = new Map<string, number[]>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function rateLimited(request: Request) {
  const key = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 8) return true;
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
  const pagePath = clean(body.pagePath, 500);
  const taskCode = clean(body.taskCode, 40);
  const outcome = clean(body.outcome, 20);
  const deviceType = clean(body.deviceType, 20);
  const severity = clean(body.severity, 10);
  const feedbackText = clean(body.feedbackText, 4000);
  const duration = Number(body.durationSeconds);
  const durationSeconds = Number.isInteger(duration) && duration >= 0 && duration <= 14400 ? duration : null;
  if (!pagePath.startsWith("/") || !allowedTasks.has(taskCode) || !allowedOutcomes.has(outcome) || !allowedDevices.has(deviceType) || !allowedSeverities.has(severity) || feedbackText.length < 10 || body.consent !== true) {
    return Response.json({ accepted: false, reason: "validation_failed" }, { status: 422 });
  }
  const reference = `BF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    await supabaseRestInsert("beta_feedback", { public_reference: reference, page_path: pagePath, task_code: taskCode, outcome, device_type: deviceType, duration_seconds: durationSeconds, severity, feedback_text: feedbackText, consent: true, status: "new" });
    return Response.json({ accepted: true, reference });
  } catch (error) {
    console.error("beta-feedback", error instanceof Error ? error.message : "unknown");
    return Response.json({ accepted: false, reason: "upstream_error" }, { status: 502 });
  }
}
