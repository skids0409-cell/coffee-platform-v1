export type PlatformConformanceRule = {
  ruleCode: string;
  severity: "critical" | "high" | "medium";
  status: "PASS" | "FAIL";
  description: string;
  evidence: string[];
};

export const PLATFORM_CONFORMANCE_REVISION = "phase6.platform.v1";

// This is a CI-gated attestation, not a runtime source-code scanner.
// tests/platform-conformance.test.mjs validates every rule against repository source.
export const platformConformanceRules: PlatformConformanceRule[] = [
  {
    ruleCode: "LEGACY_OPERATIONS_CODE_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Legacy monolithic Operations runtime is absent while partner routing remains isolated.",
    evidence: ["app/ui/Platform.tsx", "app/ui/partner/PartnerPortal.tsx"],
  },
  {
    ruleCode: "REVIEW_BROWSER_CONFIRM_ZERO",
    severity: "high",
    status: "PASS",
    description: "Review & Approval uses StandardConfirmDialog instead of browser prompt/confirm APIs.",
    evidence: ["app/ui/admin/ReviewWorkspace.tsx", "app/ui/admin/OperationsController.tsx", "app/ui/admin/StandardConfirmDialog.tsx"],
  },
  {
    ruleCode: "REVIEW_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Core Review lifecycle transitions execute through the atomic Review RPC boundary.",
    evidence: ["app/api/admin/review/route.ts", "supabase/migrations/056_phase1_atomic_review_transition.sql"],
  },
  {
    ruleCode: "RIGHTS_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Rights lifecycle transitions and audit writes are transactionally coupled.",
    evidence: ["app/api/admin/review/route.ts", "supabase/migrations/057_atomic_rights_request_transition.sql"],
  },
  {
    ruleCode: "SUPPORT_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Support mutations use purpose-built atomic RPCs with row locking and audit coupling.",
    evidence: ["app/api/admin/review/route.ts", "supabase/migrations/058_atomic_support_request_boundaries.sql"],
  },
  {
    ruleCode: "PARTNER_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Partner approval canonical side effects and submission transition commit in one database transaction.",
    evidence: ["app/api/admin/partner-submissions/route.ts", "supabase/migrations/059_atomic_partner_submission_transition.sql"],
  },
  {
    ruleCode: "DATA_IMPORT_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Data import staging, lifecycle transitions, and disposal use atomic database boundaries.",
    evidence: ["app/api/admin/data-center/route.ts", "supabase/migrations/060_atomic_data_import_boundaries.sql"],
  },
  {
    ruleCode: "SEARCH_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Search governance create/update/status/delete operations use atomic RPCs.",
    evidence: ["app/api/admin/review/route.ts", "supabase/migrations/061_atomic_search_governance.sql"],
  },
  {
    ruleCode: "TAXONOMY_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Taxonomy publication transitions use the existing atomic RPC with optimistic concurrency and transaction locking.",
    evidence: ["app/api/admin/taxonomy/route.ts"],
  },
  {
    ruleCode: "OPERATIONAL_INBOX_READ_ONLY",
    severity: "high",
    status: "PASS",
    description: "The operational inbox is a read-only projection and owns no mutation endpoint.",
    evidence: ["app/api/admin/work-queue/route.ts"],
  },
  {
    ruleCode: "PARTNER_ROUTE_ISOLATION",
    severity: "critical",
    status: "PASS",
    description: "The partner portal remains explicitly routed and isolated from admin Operations runtime concerns.",
    evidence: ["app/ui/Platform.tsx", "app/ui/partner/PartnerPortal.tsx"],
  },
];
