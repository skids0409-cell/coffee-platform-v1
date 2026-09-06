export const RIGHTS_LIFECYCLE_CONTRACT_REVISION = "rights.lifecycle.v1" as const;

export type RightsLifecycleActionId =
  | "start_review"
  | "request_evidence"
  | "resume_review"
  | "approve"
  | "reject";

export type RightsLifecycleAction = {
  action: RightsLifecycleActionId;
  label: string;
  enabled: boolean;
  targetStatus: "in_review" | "needs_evidence" | "approved" | "rejected";
  blockedReason: string | null;
  confirmationMode: "none" | "reason_required";
  requiredRoles: Array<"verifier" | "admin">;
};

export type RightsLifecycleProjection = {
  contractRevision: typeof RIGHTS_LIFECYCLE_CONTRACT_REVISION;
  currentState: string;
  availableActions: RightsLifecycleAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  retention: {
    legalHold: boolean | null;
    deletionBlocked: boolean | null;
    reason: string;
  };
};

type RightsProjectionInput = {
  status: string;
  role: string;
};

export function projectRightsLifecycle({ status, role }: RightsProjectionInput): RightsLifecycleProjection {
  const canDecide = role === "verifier" || role === "admin";
  const actions: RightsLifecycleAction[] = [];
  const blockedReasons: string[] = [];

  if (!canDecide) {
    blockedReasons.push("يتطلب الإجراء دور المراجع أو المدير");
  } else if (status === "submitted") {
    actions.push(
      {
        action: "start_review",
        label: "بدء المراجعة",
        enabled: true,
        targetStatus: "in_review",
        blockedReason: null,
        confirmationMode: "none",
        requiredRoles: ["verifier", "admin"],
      },
      {
        action: "request_evidence",
        label: "طلب دليل إضافي",
        enabled: true,
        targetStatus: "needs_evidence",
        blockedReason: null,
        confirmationMode: "none",
        requiredRoles: ["verifier", "admin"],
      },
    );
  } else if (status === "needs_evidence") {
    actions.push({
      action: "resume_review",
      label: "استئناف المراجعة بعد وصول الدليل",
      enabled: true,
      targetStatus: "in_review",
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["verifier", "admin"],
    });
  } else if (status === "in_review") {
    actions.push(
      {
        action: "request_evidence",
        label: "طلب دليل إضافي",
        enabled: true,
        targetStatus: "needs_evidence",
        blockedReason: null,
        confirmationMode: "none",
        requiredRoles: ["verifier", "admin"],
      },
      {
        action: "approve",
        label: "قبول وإغلاق",
        enabled: true,
        targetStatus: "approved",
        blockedReason: null,
        confirmationMode: "reason_required",
        requiredRoles: ["verifier", "admin"],
      },
      {
        action: "reject",
        label: "رفض مع السبب",
        enabled: true,
        targetStatus: "rejected",
        blockedReason: null,
        confirmationMode: "reason_required",
        requiredRoles: ["verifier", "admin"],
      },
    );
  }

  return {
    contractRevision: RIGHTS_LIFECYCLE_CONTRACT_REVISION,
    currentState: status,
    availableActions: actions,
    blockedReasons,
    validationRequirements: status === "in_review" ? ["القرار النهائي يتطلب ملاحظة معالجة من 10 أحرف على الأقل"] : [],
    retention: {
      legalHold: null,
      deletionBlocked: null,
      reason: "not_projected_in_rights_v1",
    },
  };
}
