export const DATA_CENTER_V2_CONFORMANCE_REVISION = "data-center.v2.conformance.v1" as const;

export type DataCenterV2ConformanceRule = {
  ruleCode: string;
  severity: "critical" | "high";
  status: "PASS";
  description: string;
  evidence: string[];
};

// CI-gated source attestation. tests/data-center-v2-conformance.test.mjs verifies
// every declaration below against repository source before any V2 cutover.
export const dataCenterV2ConformanceRules: DataCenterV2ConformanceRule[] = [
  {
    ruleCode: "MANUAL_UUID_ENTRY_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Data Center V2 exposes no manual UUID identifier input; record identifiers remain internal transport details.",
    evidence: ["app/operations/data-center-v2/page.tsx", "app/ui/admin/data-center-v2/DataCenterV2App.tsx"],
  },
  {
    ruleCode: "UNSCOPED_ENTITY_PICKERS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 does not introduce a generic entity-type picker; cross-domain work is handed off to the existing governed owner workspace.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "lib/entity-linking-contract.ts"],
  },
  {
    ruleCode: "CLIENT_INFERRED_AUTHORITY_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Batch lifecycle buttons render only from server-projected data-import.lifecycle.v1 actions and never from local role authority.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "lib/data-import-lifecycle-projection.ts"],
  },
  {
    ruleCode: "CLIENT_INFERRED_RELATIONSHIPS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 creates no client-computed polymorphic relationships or free-form canonical references.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/api/admin/data-center/route.ts"],
  },
  {
    ruleCode: "FREEFORM_CANONICAL_REFERENCES_ZERO",
    severity: "critical",
    status: "PASS",
    description: "The V2 foundation contains no text field for canonical record identifiers; source labels remain provenance rather than entity references.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx"],
  },
  {
    ruleCode: "COUNTER_SOURCE_DRIFT_ZERO",
    severity: "high",
    status: "PASS",
    description: "V2 batch counters and batch rows derive from the same authoritative batches payload; public mirror counts are separately labeled read-only probes.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx"],
  },
  {
    ruleCode: "DIRECT_DB_WRITES_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 contains no Supabase client or direct database write; all operational mutations cross existing admin API/RPC boundaries.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/api/admin/data-center/route.ts"],
  },
  {
    ruleCode: "WINDOW_PROMPT_CONFIRM_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 uses StandardConfirmDialog for projected lifecycle confirmation and no browser confirm/prompt/alert API.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/StandardConfirmDialog.tsx"],
  },
  {
    ruleCode: "LEGACY_DATA_CENTER_IMPORTS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "The new route does not import or compose DataCenterWorkspace or CatalogDraftWorkspace legacy operational surfaces.",
    evidence: ["app/operations/data-center-v2/page.tsx", "app/ui/admin/data-center-v2/DataCenterV2App.tsx"],
  },
  {
    ruleCode: "CLIENT_FACING_PARITY_READ_ONLY",
    severity: "critical",
    status: "PASS",
    description: "Customer-facing parity checks are read-only probes of public APIs and cannot mutate publication state.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/api/public-products/route.ts", "app/api/public-directory/route.ts", "app/api/public-search/route.ts"],
  },
];
