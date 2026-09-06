export const PRESERVATION_CAPABILITIES_REVISION = "preservation.capabilities.v1";

export type PreservationCapabilitiesProjection = {
  contractRevision: typeof PRESERVATION_CAPABILITIES_REVISION;
  canCreateAip: boolean;
  canVerifyFixity: boolean;
  canCreateDip: boolean;
  blockedReason: string | null;
};

export function projectPreservationCapabilities(role: string): PreservationCapabilitiesProjection {
  const canOperate = role === "verifier" || role === "admin";
  return {
    contractRevision: PRESERVATION_CAPABILITIES_REVISION,
    canCreateAip: canOperate,
    canVerifyFixity: canOperate,
    canCreateDip: canOperate,
    blockedReason: canOperate ? null : "العرض متاح؛ التنفيذ يتطلب مدققاً أو مديراً.",
  };
}
