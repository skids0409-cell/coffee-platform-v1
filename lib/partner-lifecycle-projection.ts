export const PARTNER_LIFECYCLE_CONTRACT_REVISION = "partner.lifecycle.v1" as const;

export type PartnerSubmissionStatus = "submitted" | "in_review" | "needs_changes" | "approved" | "rejected";
export type PartnerStaffRole = "editor" | "verifier" | "admin" | string;
export type PartnerLifecycleActionName = "start_review" | "request_changes" | "approve" | "reject";

export type PartnerLifecycleAction = {
  action: PartnerLifecycleActionName;
  label: string;
  targetStatus: Exclude<PartnerSubmissionStatus, "submitted">;
  enabled: boolean;
  blockedReason: string | null;
  confirmationMode: "none" | "reason_required" | "explicit";
  validationRequirements: string[];
  requiredRoles: string[];
};

export type PartnerLifecycleProjection = {
  contractRevision: typeof PARTNER_LIFECYCLE_CONTRACT_REVISION;
  currentState: PartnerSubmissionStatus | string;
  availableActions: PartnerLifecycleAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  requiredRoles: string[];
  retention: {
    governed: true;
    deletionActionAvailable: false;
    note: string;
  };
};

type PartnerProjectionInput = {
  status: string;
  role: PartnerStaffRole;
  entityType: string;
  payload?: Record<string, unknown> | null;
};

const reviewableStates = new Set(["submitted", "in_review", "needs_changes"]);
const supportedEntityTypes = new Set(["organization_update", "product_offer", "new_product", "location"]);
const requiredRoles = ["verifier", "admin"];

export function projectPartnerLifecycle(input: PartnerProjectionInput): PartnerLifecycleProjection {
  const canReview = requiredRoles.includes(input.role);
  const reviewable = reviewableStates.has(input.status);
  const commonBlock = !reviewable
    ? "الطلب لم يعد ضمن الحالات القابلة للمراجعة."
    : !canReview
      ? "يتطلب القرار صلاحية المراجع أو المدير."
      : null;

  const approvalRequirements = ["نوع submission مدعوم من الحد الذري", "نجاح الكتابة canonical بالكامل قبل اعتماد الطلب"];
  const entitySupported = supportedEntityTypes.has(input.entityType);
  const locationAddress = input.entityType === "location" ? String(input.payload?.address_ar || "").trim() : "";
  const approvalBlock = commonBlock || (!entitySupported ? "نوع الطلب غير مدعوم للاعتماد." : null) || (input.entityType === "location" && locationAddress.length < 3 ? "عنوان الموقع العربي مطلوب قبل الاعتماد." : null);

  const actions: PartnerLifecycleAction[] = [
    {
      action: "start_review",
      label: "بدء المراجعة",
      targetStatus: "in_review",
      enabled: !commonBlock && input.status !== "in_review",
      blockedReason: commonBlock || (input.status === "in_review" ? "الطلب قيد المراجعة بالفعل." : null),
      confirmationMode: "none",
      validationRequirements: [],
      requiredRoles,
    },
    {
      action: "request_changes",
      label: "إعادة للتعديل",
      targetStatus: "needs_changes",
      enabled: !commonBlock,
      blockedReason: commonBlock,
      confirmationMode: "reason_required",
      validationRequirements: ["ملاحظة مراجعة لا تقل عن 10 أحرف"],
      requiredRoles,
    },
    {
      action: "approve",
      label: "اعتماد وتحويل",
      targetStatus: "approved",
      enabled: !approvalBlock,
      blockedReason: approvalBlock,
      confirmationMode: "explicit",
      validationRequirements: approvalRequirements,
      requiredRoles,
    },
    {
      action: "reject",
      label: "رفض",
      targetStatus: "rejected",
      enabled: !commonBlock,
      blockedReason: commonBlock,
      confirmationMode: "reason_required",
      validationRequirements: ["ملاحظة مراجعة لا تقل عن 10 أحرف"],
      requiredRoles,
    },
  ];

  return {
    contractRevision: PARTNER_LIFECYCLE_CONTRACT_REVISION,
    currentState: input.status,
    availableActions: actions,
    blockedReasons: [...new Set(actions.map((action) => action.blockedReason).filter((reason): reason is string => Boolean(reason)))],
    validationRequirements: [...new Set(actions.flatMap((action) => action.validationRequirements))],
    requiredRoles,
    retention: {
      governed: true,
      deletionActionAvailable: false,
      note: "لا يعرّض عقد مراجعة الجهات حذف submission؛ يحتفظ بسجل القرار والتدقيق ضمن حدود المنصة.",
    },
  };
}
