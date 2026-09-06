export const DATA_IMPORT_LIFECYCLE_CONTRACT_REVISION = "data-import.lifecycle.v1" as const;

export type DataImportLifecycleActionName = "import" | "archive" | "restore" | "delete";

export type DataImportLifecycleAction = {
  action: DataImportLifecycleActionName;
  label: string;
  apiAction: "import_batch" | "archive_batch" | "restore_batch" | "delete_archived_batch";
  enabled: boolean;
  blockedReason: string | null;
  confirmationMode: "explicit" | "typed";
  validationRequirements: string[];
  requiredRoles: string[];
};

export type DataImportLifecycleProjection = {
  contractRevision: typeof DATA_IMPORT_LIFECYCLE_CONTRACT_REVISION;
  currentState: string;
  availableActions: DataImportLifecycleAction[];
  blockedReasons: string[];
  validationRequirements: string[];
  requiredRoles: string[];
  retention: {
    governed: true;
    deletionRequiresArchivedState: true;
    deletionRequiresAdmin: true;
    note: string;
  };
};

type ProjectionInput = {
  status: string;
  role: string;
};

export function projectDataImportLifecycle(input: ProjectionInput): DataImportLifecycleProjection {
  const isAdmin = input.role === "admin";
  const actions: DataImportLifecycleAction[] = [];

  if (input.status === "ready") {
    actions.push({
      action: "import",
      label: "تحويل إلى مسودات",
      apiAction: "import_batch",
      enabled: true,
      blockedReason: null,
      confirmationMode: "explicit",
      validationRequirements: ["الدفعة في حالة ready", "إنشاء السجلات كمسودات فقط"],
      requiredRoles: ["staff"],
    });
  }

  if (input.status === "imported" || input.status === "rejected") {
    actions.push({
      action: "archive",
      label: "حفظ في الأرشيف",
      apiAction: "archive_batch",
      enabled: true,
      blockedReason: null,
      confirmationMode: "explicit",
      validationRequirements: ["الدفعة مكتملة: imported أو rejected"],
      requiredRoles: ["staff"],
    });
  }

  if (input.status === "archived") {
    actions.push(
      {
        action: "restore",
        label: "استعادة إلى سجل الدفعات",
        apiAction: "restore_batch",
        enabled: true,
        blockedReason: null,
        confirmationMode: "explicit",
        validationRequirements: ["الدفعة في حالة archived"],
        requiredRoles: ["staff"],
      },
      {
        action: "delete",
        label: "مسح نهائي",
        apiAction: "delete_archived_batch",
        enabled: isAdmin,
        blockedReason: isAdmin ? null : "المسح النهائي يتطلب صلاحية المدير.",
        confirmationMode: "typed",
        validationRequirements: ["الدفعة في حالة archived", "مطابقة رمز الدفعة للتأكيد"],
        requiredRoles: ["admin"],
      },
    );
  }

  return {
    contractRevision: DATA_IMPORT_LIFECYCLE_CONTRACT_REVISION,
    currentState: input.status,
    availableActions: actions,
    blockedReasons: actions.map((action) => action.blockedReason).filter((reason): reason is string => Boolean(reason)),
    validationRequirements: [...new Set(actions.flatMap((action) => action.validationRequirements))],
    requiredRoles: [...new Set(actions.flatMap((action) => action.requiredRoles))],
    retention: {
      governed: true,
      deletionRequiresArchivedState: true,
      deletionRequiresAdmin: true,
      note: "المسح النهائي يزيل سجل الدفعة وصفوف intake الخام فقط؛ السجلات التشغيلية الناتجة تبقى مستقلة.",
    },
  };
}
