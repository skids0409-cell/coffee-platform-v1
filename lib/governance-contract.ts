export const GOVERNANCE_KERNEL_REVISION = "wave-a.phase1.v1" as const;
export const ENTERPRISE_ARCHITECTURE_BASELINE = "EA-BASELINE-001.v1.0" as const;

export const CANONICAL_LIFECYCLE_PHASES = [
  "INGESTED",
  "VALIDATING",
  "REVIEW",
  "ACTIVE",
  "PUBLISHED",
  "RETAINED",
  "QUARANTINE",
  "LEGAL_HOLD",
  "DISPOSITION_REVIEW",
  "DISPOSED",
] as const;

export type CanonicalLifecyclePhase = (typeof CANONICAL_LIFECYCLE_PHASES)[number];

export const GOVERNED_OBJECT_TYPES = [
  "media_asset",
  "source_record",
  "data_import_batch",
  "data_intake_row",
  "product",
  "organization",
  "brand",
  "offer",
  "content",
  "origin_claim",
  "partner_submission",
] as const;

export type GovernedObjectType = (typeof GOVERNED_OBJECT_TYPES)[number];
export type GovernedDomain = "DAM" | "RECORD" | "ENTITY" | "INTAKE" | "WORKFLOW";

export type GovernedObjectEnvelope = {
  domain: GovernedDomain;
  object_type: Exclude<GovernedObjectType, "partner_submission">;
  object_id: string;
  source_state: string;
  canonical_phase: CanonicalLifecyclePhase;
  owner_actor_id: string | null;
  created_at: string;
  updated_at: string;
  governance_metadata: Record<string, unknown>;
};

export function isCanonicalLifecyclePhase(value: unknown): value is CanonicalLifecyclePhase {
  return typeof value === "string" && (CANONICAL_LIFECYCLE_PHASES as readonly string[]).includes(value);
}
