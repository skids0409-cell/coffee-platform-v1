export const SEARCH_TERM_LIFECYCLE_CONTRACT_REVISION = "search-governance.lifecycle.v1" as const;

export type SearchTermLifecycleActionName = "activate" | "retire" | "return_to_draft" | "delete";

export type SearchTermLifecycleAction = {
  action: SearchTermLifecycleActionName;
  label: string;
  apiAction: "set_search_term_status" | "delete_search_term";
  nextStatus: "draft" | "active" | "retired" | null;
  enabled: boolean;
  blockedReason: string | null;
  confirmation: {
    required: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: "default" | "danger";
  };
  validationRequirements: string[];
  requiredRoles: string[];
};

export type SearchTermLifecycleProjection = {
  contractRevision: typeof SEARCH_TERM_LIFECYCLE_CONTRACT_REVISION;
  currentState: "draft" | "active" | "retired";
  availableActions: SearchTermLifecycleAction[];
  editConfirmation: {
    required: boolean;
    title: string;
    description: string;
    confirmLabel: string;
  };
  blockedReasons: string[];
  requiredRoles: string[];
};

type ProjectionInput = {
  status: "draft" | "active" | "retired";
  role: string;
};

export function projectSearchTermLifecycle(input: ProjectionInput): SearchTermLifecycleProjection {
  const canVerify = input.role === "verifier" || input.role === "admin";
  const isAdmin = input.role === "admin";
  const actions: SearchTermLifecycleAction[] = [];

  if (input.status !== "active") {
    actions.push({
      action: "activate",
      label: "تفعيل",
      apiAction: "set_search_term_status",
      nextStatus: "active",
      enabled: canVerify,
      blockedReason: canVerify ? null : "تفعيل مصطلح البحث يتطلب صلاحية المراجع أو المدير.",
      confirmation: {
        required: true,
        title: "تفعيل مصطلح البحث",
        description: "سيؤثر هذا المصطلح فوراً في فهم البحث وترتيب النتائج. تأكد من مراجعة المعنى والمرادفات والنطاق قبل المتابعة.",
        confirmLabel: "تفعيل المصطلح",
        tone: "default",
      },
      validationRequirements: ["المصطلح غير فعال حالياً", "مراجعة المعنى والمرادفات والنطاق"],
      requiredRoles: ["verifier", "admin"],
    });
  }

  if (input.status === "active") {
    actions.push({
      action: "retire",
      label: "إيقاف",
      apiAction: "set_search_term_status",
      nextStatus: "retired",
      enabled: true,
      blockedReason: null,
      confirmation: {
        required: false,
        title: "إيقاف مصطلح البحث",
        description: "سيُوقف المصطلح عن التأثير في نتائج البحث.",
        confirmLabel: "إيقاف",
        tone: "default",
      },
      validationRequirements: ["المصطلح فعال حالياً"],
      requiredRoles: ["staff"],
    });
  }

  if (input.status === "retired") {
    actions.push({
      action: "return_to_draft",
      label: "إعادة لمسودة",
      apiAction: "set_search_term_status",
      nextStatus: "draft",
      enabled: true,
      blockedReason: null,
      confirmation: {
        required: false,
        title: "إعادة المصطلح لمسودة",
        description: "سيعود المصطلح إلى حالة المسودة دون التأثير في نتائج البحث.",
        confirmLabel: "إعادة لمسودة",
        tone: "default",
      },
      validationRequirements: ["المصطلح متقاعد حالياً"],
      requiredRoles: ["staff"],
    });
  }

  if (input.status !== "active") {
    actions.push({
      action: "delete",
      label: "حذف",
      apiAction: "delete_search_term",
      nextStatus: null,
      enabled: isAdmin,
      blockedReason: isAdmin ? null : "الحذف النهائي لمصطلح البحث يتطلب صلاحية المدير.",
      confirmation: {
        required: true,
        title: "حذف مصطلح البحث",
        description: "سيُحذف هذا المصطلح غير الفعال نهائياً من القاموس. لا يمكن التراجع عن هذا الإجراء.",
        confirmLabel: "حذف نهائي",
        tone: "danger",
      },
      validationRequirements: ["المصطلح غير فعال"],
      requiredRoles: ["admin"],
    });
  }

  return {
    contractRevision: SEARCH_TERM_LIFECYCLE_CONTRACT_REVISION,
    currentState: input.status,
    availableActions: actions,
    editConfirmation: {
      required: input.status === "active",
      title: "تعديل مصطلح بحث فعال",
      description: "سيؤثر هذا التعديل فوراً في نتائج البحث. تأكد من مراجعة المصطلح والمرادفات والنطاق قبل الحفظ.",
      confirmLabel: "حفظ التعديل",
    },
    blockedReasons: actions.map((action) => action.blockedReason).filter((reason): reason is string => Boolean(reason)),
    requiredRoles: [...new Set(actions.flatMap((action) => action.requiredRoles))],
  };
}
