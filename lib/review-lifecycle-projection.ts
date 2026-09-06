export const REVIEW_LIFECYCLE_CONTRACT_REVISION = "review.lifecycle.v1" as const;

export type ReviewLifecycleActionId =
  | "open"
  | "submit_review"
  | "publish"
  | "admin_override_publish"
  | "return_draft"
  | "reject"
  | "delete";

export type ReviewConfirmationMode = "none" | "standard" | "reason_required" | "typed_destructive";

export type ReviewLifecycleAction = {
  action: ReviewLifecycleActionId;
  label: string;
  enabled: boolean;
  targetStatus?: "draft" | "in_review" | "published" | "rejected";
  blockedReason: string | null;
  confirmationMode: ReviewConfirmationMode;
  requiredRoles: Array<"editor" | "verifier" | "admin">;
};

export type ReviewLifecycleProjection = {
  contractRevision: typeof REVIEW_LIFECYCLE_CONTRACT_REVISION;
  currentState: string;
  availableActions: ReviewLifecycleAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  retention: {
    legalHold: boolean | null;
    deletionBlocked: boolean | null;
    reason: string;
  };
};

type ProjectionInput = {
  status: string;
  ready: boolean;
  blockers: string[];
  role: string;
};

export function projectReviewLifecycle({ status, ready, blockers, role }: ProjectionInput): ReviewLifecycleProjection {
  const actions: ReviewLifecycleAction[] = [
    {
      action: "open",
      label: "فتح وتدقيق",
      enabled: true,
      blockedReason: null,
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    },
  ];

  const canVerify = role === "verifier" || role === "admin";
  const isAdmin = role === "admin";

  if (status === "draft") {
    actions.push({
      action: "submit_review",
      label: "إرسال للمراجعة",
      enabled: true,
      targetStatus: "in_review",
      blockedReason: null,
      confirmationMode: "standard",
      requiredRoles: ["editor", "verifier", "admin"],
    });
  }

  if (status === "in_review" && canVerify) {
    actions.push({
      action: "publish",
      label: "اعتماد للنشر",
      enabled: ready,
      targetStatus: "published",
      blockedReason: ready ? null : blockers[0] || "أغلق النواقص الظاهرة قبل النشر",
      confirmationMode: "standard",
      requiredRoles: ["verifier", "admin"],
    });
  }

  if (status === "in_review" && !ready && isAdmin) {
    actions.push({
      action: "admin_override_publish",
      label: "اعتماد إداري مع توثيق السبب",
      enabled: true,
      targetStatus: "published",
      blockedReason: null,
      confirmationMode: "reason_required",
      requiredRoles: ["admin"],
    });
  }

  if (status === "in_review" || status === "rejected") {
    actions.push({
      action: "return_draft",
      label: "إعادة لمسودة",
      enabled: true,
      targetStatus: "draft",
      blockedReason: null,
      confirmationMode: "standard",
      requiredRoles: ["editor", "verifier", "admin"],
    });
  }

  if (canVerify && (status === "draft" || status === "in_review")) {
    actions.push({
      action: "reject",
      label: "رفض",
      enabled: true,
      targetStatus: "rejected",
      blockedReason: null,
      confirmationMode: "standard",
      requiredRoles: ["verifier", "admin"],
    });
  }

  if (isAdmin && status !== "published") {
    actions.push({
      action: "delete",
      label: "حذف نهائي",
      enabled: true,
      blockedReason: null,
      confirmationMode: "typed_destructive",
      requiredRoles: ["admin"],
    });
  }

  return {
    contractRevision: REVIEW_LIFECYCLE_CONTRACT_REVISION,
    currentState: status,
    availableActions: actions,
    blockedReasons: [...blockers],
    validationRequirements: [...blockers],
    retention: {
      legalHold: null,
      deletionBlocked: null,
      reason: "not_projected_in_review_v1",
    },
  };
}
