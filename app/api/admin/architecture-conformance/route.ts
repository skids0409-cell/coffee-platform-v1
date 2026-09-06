import { requireStaff } from "@/lib/supabase-admin";
import { mediaRpc } from "@/lib/media-vault";
import { PLATFORM_CONFORMANCE_REVISION, platformConformanceRules } from "@/lib/platform-conformance";
import { OPERATIONS_REMEDIATION_REVISION, operationsRemediationRules } from "@/lib/operations-remediation-conformance";

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
    const kernelRules = await mediaRpc<ConformanceRow[]>(admin.token, "architecture_conformance_report", {});
    const kernelFailed = kernelRules.filter((rule) => rule.status === "FAIL");
    const kernelCriticalFailures = kernelFailed.filter((rule) => rule.severity === "critical");
    const platformFailed = platformConformanceRules.filter((rule) => rule.status === "FAIL");
    const platformCriticalFailures = platformFailed.filter((rule) => rule.severity === "critical");
    const remediationFailed = operationsRemediationRules.filter((rule) => rule.status === "FAIL");
    const remediationCriticalFailures = remediationFailed.filter((rule) => rule.severity === "critical");
    const kernelStatus = kernelCriticalFailures.length === 0 ? "CONFORMANT" : "NON_CONFORMANT";
    const platformStatus = platformCriticalFailures.length === 0 ? "CONFORMANT" : "NON_CONFORMANT";
    const remediationStatus = remediationCriticalFailures.length === 0 ? "CONFORMANT" : "NON_CONFORMANT";

    return Response.json({
      authenticated: true,
      role: admin.profile.role,
      baselineRevision: "wave-c.phase8.v1",
      kernel: {
        revision: "wave-c.phase8.v1",
        conformanceStatus: kernelStatus,
        summary: {
          totalRules: kernelRules.length,
          passedRules: kernelRules.length - kernelFailed.length,
          failedRules: kernelFailed.length,
          criticalFailures: kernelCriticalFailures.length,
        },
        rules: kernelRules,
      },
      platform: {
        revision: PLATFORM_CONFORMANCE_REVISION,
        attestation: "CI_GATED_STATIC_SOURCE",
        conformanceStatus: platformStatus,
        summary: {
          totalRules: platformConformanceRules.length,
          passedRules: platformConformanceRules.length - platformFailed.length,
          failedRules: platformFailed.length,
          criticalFailures: platformCriticalFailures.length,
        },
        rules: platformConformanceRules,
      },
      remediation: {
        revision: OPERATIONS_REMEDIATION_REVISION,
        attestation: "CI_GATED_STATIC_SOURCE",
        conformanceStatus: remediationStatus,
        summary: {
          totalRules: operationsRemediationRules.length,
          passedRules: operationsRemediationRules.length - remediationFailed.length,
          failedRules: remediationFailed.length,
          criticalFailures: remediationCriticalFailures.length,
        },
        rules: operationsRemediationRules,
      },
      conformanceStatus: kernelStatus === "CONFORMANT" && platformStatus === "CONFORMANT" && remediationStatus === "CONFORMANT"
        ? "CONFORMANT"
        : "NON_CONFORMANT",
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("architecture-conformance-read", error instanceof Error ? error.message : error);
    return Response.json({ authenticated: true, reason: "upstream_error" }, { status: 502 });
  }
}
