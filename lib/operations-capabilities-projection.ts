export const OPERATIONS_CAPABILITIES_CONTRACT_REVISION = "operations.capabilities.v1" as const;

export type OperationsCapabilitiesProjection = {
  contractRevision: typeof OPERATIONS_CAPABILITIES_CONTRACT_REVISION;
  canManageTaxonomy: boolean;
  canRestoreRevision: boolean;
  canResolveQualityIssue: boolean;
  canDeleteInactiveCatalog: boolean;
};

export function projectOperationsCapabilities(role: string): OperationsCapabilitiesProjection {
  const canVerify = role === "verifier" || role === "admin";
  const isAdmin = role === "admin";

  return {
    contractRevision: OPERATIONS_CAPABILITIES_CONTRACT_REVISION,
    canManageTaxonomy: isAdmin,
    canRestoreRevision: canVerify,
    canResolveQualityIssue: canVerify,
    canDeleteInactiveCatalog: isAdmin,
  };
}
