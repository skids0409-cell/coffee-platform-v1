export type PlatformConformanceRule = {
  ruleCode: string;
  severity: "critical" | "high" | "medium";
  status: "PASS" | "FAIL";
  description: string;
  evidence: string[];
};

export const PLATFORM_CONFORMANCE_REVISION = "phase6.platform.v2";

// CI-gated attestation. tests/platform-conformance.test.mjs validates every
// declared PASS rule against repository source and immutable database contracts.
export const platformConformanceRules: PlatformConformanceRule[] = [
  {
    ruleCode: "LEGACY_OPERATIONS_CODE_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Legacy monolithic Operations runtime is absent while partner routing remains isolated.",
    evidence: ["app/ui/Platform.tsx", "app/ui/partner/PartnerPortal.tsx"],
  },
  {
    ruleCode: "WINDOW_BROWSER_DIALOGS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Governed UI contains no window.prompt, window.confirm, or window.alert lifecycle interactions.",
    evidence: ["app/ui/admin", "app/ui/partner", "app/ui/admin/StandardConfirmDialog.tsx"],
  },
  {
    ruleCode: "CLIENT_INFERRED_ACTIONS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Privileged Operations actions consume server-projected lifecycle/capability contracts instead of raw client role inference.",
    evidence: ["lib/*-lifecycle-projection.ts", "lib/operations-capabilities-projection.ts", "lib/preservation-capabilities-projection.ts", "app/ui/admin"],
  },
  {
    ruleCode: "DIRECT_LIFECYCLE_REST_WRITES_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Governed lifecycle mutations enter purpose-built RPC boundaries instead of direct REST table writes.",
    evidence: ["app/api/admin/review/route.ts", "app/api/admin/data-center/route.ts", "app/api/admin/partner-submissions/route.ts", "app/api/admin/media-vault/route.ts", "app/api/admin/taxonomy/route.ts"],
  },
  {
    ruleCode: "UNAUDITED_TRANSITIONS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Governed lifecycle RPCs couple state transitions to append-only audit/event writes.",
    evidence: ["supabase/migrations/043_closed_loop_media_asset_lifecycle.sql", "supabase/migrations/056_phase1_atomic_review_transition.sql", "supabase/migrations/057_atomic_rights_request_transition.sql", "supabase/migrations/058_atomic_support_request_boundaries.sql", "supabase/migrations/059_atomic_partner_submission_transition.sql", "supabase/migrations/060_atomic_data_import_boundaries.sql", "supabase/migrations/061_atomic_search_governance.sql"],
  },
  {
    ruleCode: "ORPHAN_RELATIONSHIPS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Canonical media relationships are non-null, foreign-key constrained, target validated, and deletion restricted.",
    evidence: ["supabase/migrations/043_closed_loop_media_asset_lifecycle.sql", "supabase/migrations/049_wave_a_zero_orphan_relationship_registry.sql"],
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
    ruleCode: "MEDIA_VAULT_ATOMIC_BOUNDARY",
    severity: "critical",
    status: "PASS",
    description: "Media Vault lifecycle and disposal actions remain server-authoritative, role checked, row locked, and audit preserving.",
    evidence: ["app/api/admin/media-vault/route.ts", "app/api/admin/media-vault/purge/route.ts", "supabase/migrations/043_closed_loop_media_asset_lifecycle.sql"],
  },
  {
    ruleCode: "OPERATIONAL_INBOX_READ_ONLY",
    severity: "high",
    status: "PASS",
    description: "The operational inbox is a read-only projection and owns no mutation endpoint.",
    evidence: ["app/api/admin/work-queue/route.ts"],
  },
  {
    ruleCode: "PARTNER_REGRESSIONS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Partner portal routing remains isolated and partner decisions remain behind the governed server boundary.",
    evidence: ["app/ui/Platform.tsx", "app/ui/partner/PartnerPortal.tsx", "app/api/admin/partner-submissions/route.ts"],
  },
];
