export type OperationsRemediationRule = {
  ruleCode: string;
  package: string;
  severity: "critical" | "high";
  status: "PASS" | "FAIL";
  description: string;
  evidence: string[];
};

export const OPERATIONS_REMEDIATION_REVISION = "operations.remediation.v1";

// This is a CI-gated attestation. tests/operations-remediation-conformance.test.mjs
// proves every declared PASS rule against repository source. The runtime
// architecture endpoint combines this result with the DB kernel and platform gates.
export const operationsRemediationRules: OperationsRemediationRule[] = [
  {
    ruleCode: "FOUNDATION_RESOLVER_GOVERNED",
    package: "Foundation Resolver",
    severity: "critical",
    status: "PASS",
    description: "Operational entity references are resolved through a staff-authenticated contextual resolver; UUIDs remain internal identifiers.",
    evidence: ["lib/entity-linking-contract.ts", "app/api/admin/entity-resolver/route.ts", "app/ui/admin/ContextualEntitySelector.tsx"],
  },
  {
    ruleCode: "MEDIA_LINKING_CONTEXTUAL",
    package: "Media Linking",
    severity: "critical",
    status: "PASS",
    description: "Pending media review consumes contextual entity types from the media-linking contract and exposes no manual UUID field.",
    evidence: ["app/ui/admin/PendingAssetReviewConsole.tsx", "app/api/admin/media-vault/review/route.ts", "lib/entity-linking-contract.ts"],
  },
  {
    ruleCode: "SUPPORT_CANONICAL_REFERENCES",
    package: "Support Canonicalization",
    severity: "critical",
    status: "PASS",
    description: "Support assignees are active staff and technical escalation points to canonical governed technical_tasks through a foreign key and atomic RPC boundary.",
    evidence: ["supabase/migrations/063_support_technical_task_governance.sql", "supabase/migrations/064_support_technical_task_fk_indexes.sql", "app/api/admin/review/route.ts", "app/ui/admin/SupportWorkspace.tsx"],
  },
  {
    ruleCode: "SEARCH_WEAK_QUERY_INTAKE",
    package: "Search Governance Intake",
    severity: "critical",
    status: "PASS",
    description: "Weak search-query observations can be promoted into governed draft terms through the existing atomic Search Governance RPC boundary.",
    evidence: ["app/ui/admin/SearchGovernanceWorkspace.tsx", "app/ui/admin/OperationsController.tsx", "supabase/migrations/061_atomic_search_governance.sql"],
  },
  {
    ruleCode: "PRESERVATION_DOMAIN_COUNTS",
    package: "Preservation & Archive",
    severity: "high",
    status: "PASS",
    description: "OAIS counters derive from the preservation inventory while catalog and import archive counters are explicitly separate domains.",
    evidence: ["app/api/admin/preservation/route.ts", "app/ui/admin/governance/MediaPreservationProjection.tsx", "app/ui/admin/ArchiveWorkspace.tsx", "app/ui/admin/ArchivedImportBatches.tsx"],
  },
  {
    ruleCode: "TAXONOMY_EDITOR_UNOBSTRUCTED",
    package: "Taxonomy Workspace",
    severity: "high",
    status: "PASS",
    description: "Taxonomy editing runs in an isolated stacking context and the global Operations navigation cannot overlay the taxonomy editor.",
    evidence: ["app/ui/admin/OperationsWorkspaceShell.tsx", "app/ui/admin/governance/OperationsCenterArchitecture.tsx", "app/ui/admin/TaxonomyWorkspace.tsx"],
  },
  {
    ruleCode: "PERMISSIONS_SESSION_BOUNDARIES",
    package: "Permissions & Session",
    severity: "critical",
    status: "PASS",
    description: "Operational reads require staff sessions and privileged writes remain same-origin, role-gated, and server-authoritative.",
    evidence: ["app/api/admin/entity-resolver/route.ts", "app/api/admin/technical-tasks/route.ts", "app/api/admin/review/route.ts", "app/api/admin/preservation/route.ts", "app/api/admin/taxonomy/route.ts", "app/api/admin/media-vault/review/route.ts"],
  },
  {
    ruleCode: "CONFORMANCE_SWEEP_ZERO_TOLERANCE",
    package: "Conformance Sweep",
    severity: "critical",
    status: "PASS",
    description: "The remediation branch is accepted only when permanent lint, test, build, generated-source, platform-conformance, and remediation-conformance gates all pass with no temporary cutover tooling retained.",
    evidence: [".github/workflows/coffee-platform.yml", "tests/platform-conformance.test.mjs", "tests/operations-remediation-conformance.test.mjs"],
  },
];
