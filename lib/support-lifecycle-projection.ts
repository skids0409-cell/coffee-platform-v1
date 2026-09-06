export const SUPPORT_LIFECYCLE_CONTRACT_REVISION = "support.lifecycle.v1" as const;

export type SupportStatus = "new" | "triaged" | "in_progress" | "waiting_user" | "resolved" | "closed" | "spam" | "archived";

export type SupportStatusOption = {
  value: SupportStatus;
  label: string;
};

export type SupportWorkflowActionId = "escalate" | "reply" | "archive" | "delete";

export type SupportWorkflowAction = {
  action: SupportWorkflowActionId;
  label: string;
  enabled: boolean;
  blockedReason: string | null;
  mutationKind: "event" | "status" | "delete";
  event?: "escalated" | "reply";
  targetStatus?: "archived";
  confirmationMode: "none" | "destructive";
  requiredRoles: Array<"editor" | "verifier" | "admin">;
};

export type SupportLifecycleProjection = {
  contractRevision: typeof SUPPORT_LIFECYCLE_CONTRACT_REVISION;
  currentState: string;
  statusOptions: SupportStatusOption[];
  availableActions: SupportWorkflowAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  retention: {
    legalHold: boolean | null;
    deletionBlocked: boolean;
    reason: string;
  };
};

const STATUS_OPTIONS: SupportStatusOption[] = [
  { value: "new", label: "جديد" },
  { value: "triaged", label: "مصنف" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "waiting_user", label: "بانتظار المستخدم" },
  { value: "resolved", label: "تم الحل" },
  { value: "closed", label: "مغلق" },
  { value: "spam", label: "مزعج" },
  { value: "archived", label: "مؤرشف" },
];

export function projectSupportLifecycle(input: {
  status: string;
  role: string;
  requesterPhone: string | null;
  resolutionNote: string | null;
}): SupportLifecycleProjection {
  const hasPhone = Boolean(input.requesterPhone?.trim());
  const hasResolution = (input.resolutionNote?.trim().length || 0) >= 3;
  const canArchive = input.status === "resolved" || input.status === "closed";
  const canDelete = input.role === "admin" && input.status === "archived";
  const replyBlockedReason = !hasPhone
    ? "رقم واتساب للمستخدم غير موجود"
    : !hasResolution
      ? "نتيجة الحل غير محفوظة"
      : null;

  const availableActions: SupportWorkflowAction[] = [
    {
      action: "escalate",
      label: "إحالة بالبريد إلى فريق الدعم",
      enabled: true,
      blockedReason: null,
      mutationKind: "event",
      event: "escalated",
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    },
    {
      action: "reply",
      label: "إرسال نتيجة الحل عبر واتساب",
      enabled: !replyBlockedReason,
      blockedReason: replyBlockedReason,
      mutationKind: "event",
      event: "reply",
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    },
    {
      action: "archive",
      label: "أرشفة بعد الحل",
      enabled: canArchive,
      blockedReason: canArchive ? null : "الأرشفة متاحة فقط بعد الحل أو الإغلاق",
      mutationKind: "status",
      targetStatus: "archived",
      confirmationMode: "none",
      requiredRoles: ["editor", "verifier", "admin"],
    },
    {
      action: "delete",
      label: "مسح الطلب نهائياً",
      enabled: canDelete,
      blockedReason: input.status !== "archived" ? "يجب أرشفة الطلب أولاً" : input.role !== "admin" ? "الحذف النهائي يتطلب دور المدير" : null,
      mutationKind: "delete",
      confirmationMode: "destructive",
      requiredRoles: ["admin"],
    },
  ];

  return {
    contractRevision: SUPPORT_LIFECYCLE_CONTRACT_REVISION,
    currentState: input.status,
    statusOptions: STATUS_OPTIONS,
    availableActions,
    blockedReasons: availableActions.filter((action) => !action.enabled && action.blockedReason).map((action) => action.blockedReason as string),
    validationRequirements: ["الرد للمستخدم يتطلب رقم واتساب ونتيجة حل محفوظة", "الحذف النهائي يتطلب طلباً مؤرشفاً ودور المدير"],
    retention: {
      legalHold: null,
      deletionBlocked: !canDelete,
      reason: canDelete ? "admin_archived_delete_allowed" : "support_delete_requires_archived_admin",
    },
  };
}
