import { requireStaff } from "@/lib/supabase-admin";
import { mediaRpc } from "@/lib/media-vault";

type ConformanceRow = {
  rule_code: string;
  standard_ref: string;
  severity: "critical" | "high" | "medium";
  status: "PASS" | "FAIL";
  finding_count: number;
  description: string;
};

export async function GET(request: Request) {
  const admin = await requireStaff(request).catch(() => null);
  if (!admin) return Response.json({ authenticated: false }, { status: 401 });
  try {
    const rules = await mediaRpc<ConformanceRow[]>(admin.token, "architecture_conformance_report", {});
    const failed = rules.filter((rule) => rule.status === "FAIL");
    const criticalFailures = failed.filter((rule) => rule.severity === "critical");
    return Response.json({
      authenticated: true,
      role: admin.profile.role,
      baselineRevision: "wave-c.phase8.v1",
      conformanceStatus: criticalFailures.length === 0 ? "CONFORMANT" : "NON_CONFORMANT",
      summary: {
        totalRules: rules.length,
        passedRules: rules.length - failed.length,
        failedRules: failed.length,
        criticalFailures: criticalFailures.length,
      },
      rules,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("architecture-conformance-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}
