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
    evidence: ["app/operations/data-center-v2/page.tsx", "app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx"],
  },
  {
    ruleCode: "UNSCOPED_ENTITY_PICKERS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 uses entity-specific server-sourced record lists and never exposes one generic polymorphic entity-type picker.",
    evidence: ["app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "lib/entity-linking-contract.ts"],
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
    description: "V2 creates no client-computed polymorphic links; structured catalog references are selected from server-sourced canonical records and revalidated by existing RPCs.",
    evidence: ["app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "app/api/admin/data-center/route.ts"],
  },
  {
    ruleCode: "FREEFORM_CANONICAL_REFERENCES_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 contains no operator text input for canonical record IDs; source labels remain provenance rather than entity references.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx"],
  },
  {
    ruleCode: "COUNTER_SOURCE_DRIFT_ZERO",
    severity: "high",
    status: "PASS",
    description: "V2 batch counters and batch rows derive from the same authoritative batches payload; public mirror counts remain a separately labeled domain.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx"],
  },
  {
    ruleCode: "DIRECT_DB_WRITES_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 contains no Supabase client or direct database write; all operational mutations cross existing admin API/RPC boundaries.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "app/api/admin/data-center/route.ts"],
  },
  {
    ruleCode: "UNAUDITED_MUTATIONS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "Every V2 mutation delegates to existing catalog/import RPC boundaries whose permanent regression tests require coupled audit writes.",
    evidence: ["app/api/admin/data-center/route.ts", "supabase/migrations/060_atomic_data_import_boundaries.sql", "tests/atomic-operational-mutations.test.mjs"],
  },
  {
    ruleCode: "ORPHAN_RELATIONSHIPS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 never fabricates relationship IDs and uses canonical FK-backed records through existing governed creation/import boundaries.",
    evidence: ["supabase/migrations/001_core_schema.sql", "supabase/migrations/060_atomic_data_import_boundaries.sql", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx"],
  },
  {
    ruleCode: "WINDOW_PROMPT_CONFIRM_ZERO",
    severity: "critical",
    status: "PASS",
    description: "V2 uses StandardConfirmDialog for lifecycle and catalog-draft confirmation and no browser confirm/prompt/alert API.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "app/ui/admin/StandardConfirmDialog.tsx"],
  },
  {
    ruleCode: "LEGACY_DATA_CENTER_IMPORTS_ZERO",
    severity: "critical",
    status: "PASS",
    description: "The new route does not import or compose DataCenterWorkspace or CatalogDraftWorkspace legacy operational surfaces.",
    evidence: ["app/operations/data-center-v2/page.tsx", "app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/ui/admin/data-center-v2/CatalogIntakeV2.tsx"],
  },
  {
    ruleCode: "STRUCTURED_CATALOG_INTAKE_PARITY",
    severity: "critical",
    status: "PASS",
    description: "V2 exposes separate draft-only intake for master products, seller offers, organizations, brands, origins and content while preserving master/vendor separation.",
    evidence: ["app/ui/admin/data-center-v2/CatalogIntakeV2.tsx", "app/api/admin/data-center/route.ts", "app/ui/admin/RecordForm.tsx"],
  },
  {
    ruleCode: "CLIENT_FACING_PARITY_READ_ONLY",
    severity: "critical",
    status: "PASS",
    description: "Customer-facing parity checks are read-only probes of public APIs and cannot mutate publication state.",
    evidence: ["app/ui/admin/data-center-v2/DataCenterV2App.tsx", "app/api/public-products/route.ts", "app/api/public-directory/route.ts", "app/api/public-search/route.ts"],
  },
];
