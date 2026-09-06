export const PENDING_ASSET_REVIEW_CAPABILITIES_REVISION = "pending-asset-review.capabilities.v1";

export type PendingAssetReviewCapabilities = {
  contractRevision: typeof PENDING_ASSET_REVIEW_CAPABILITIES_REVISION;
  canDecide: boolean;
  blockedReason: string | null;
};

export function projectPendingAssetReviewCapabilities(role: string): PendingAssetReviewCapabilities {
  const canDecide = role === "verifier" || role === "admin";
  return {
    contractRevision: PENDING_ASSET_REVIEW_CAPABILITIES_REVISION,
    canDecide,
    blockedReason: canDecide ? null : "هذه العملية تتطلب صلاحية مراجع/معتمد أو مدير.",
  };
}
