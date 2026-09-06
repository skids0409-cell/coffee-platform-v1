export const BETA_LIFECYCLE_CONTRACT_REVISION = "beta.lifecycle.v1" as const;

export type BetaLifecycleActionId = "triage" | "resolve" | "duplicate";

export type BetaLifecycleAction = {
  action: BetaLifecycleActionId;
  label: string;
  enabled: boolean;
  targetStatus: "triaged" | "resolved" | "duplicate";
  blockedReason: string | null;
  confirmationMode: "none";
  requiredRoles: Array<"editor" | "verifier" | "admin">;
};

export type BetaLifecycleProjection = {
  contractRevision: typeof BETA_LIFECYCLE_CONTRACT_REVISION;
  currentState: string;
  availableActions: BetaLifecycleAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  retention: {
    legalHold: boolean | null;
    deletionBlocked: boolean | null;
    reason: string;
  };
};

export function projectBetaLifecycle(status: string): BetaLifecycleProjection {
  const actions: BetaLifecycleAction[] = [];

  if (status === "new") {
    actions.push({
      action: "triage",
      label: "بدء المعالجة",
      enabled: true,
      targetStatus: "triaged",
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    });
    actions.push({
      action: "duplicate",
      label: "مكرر",
      enabled: true,
      targetStatus: "duplicate",
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    });
  } else if (status === "triaged" || status === "in_progress") {
    actions.push({
      action: "resolve",
      label: "إغلاق بعد الإصلاح",
      enabled: true,
      targetStatus: "resolved",
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    });
    actions.push({
      action: "duplicate",
      label: "مكرر",
      enabled: true,
      targetStatus: "duplicate",
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    });
  }

  return {
    contractRevision: BETA_LIFECYCLE_CONTRACT_REVISION,
    currentState: status,
    availableActions: actions,
    blockedReasons: [],
    validationRequirements: [],
    retention: {
      legalHold: null,
      deletionBlocked: null,
      reason: "not_projected_in_beta_v1",
    },
  };
}
