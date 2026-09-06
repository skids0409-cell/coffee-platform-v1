export const MEDIA_VAULT_LIFECYCLE_REVISION = "media-vault.lifecycle.v1";

export type MediaVaultActionName =
  | "unlink"
  | "quarantine"
  | "restore"
  | "request_purge"
  | "approve_purge"
  | "reject_purge"
  | "execute_purge";

export type MediaVaultLifecycleAction = {
  action: MediaVaultActionName;
  label: string;
  enabled: boolean;
  blockedReason: string | null;
  endpoint: "vault" | "purge";
  requestId: string | null;
  confirmation: {
    required: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: "default" | "danger";
    input?: {
      label: string;
      placeholder?: string;
      minLength?: number;
      requiredValue?: string;
      multiline?: boolean;
    };
  };
};

export type MediaVaultLifecycleProjection = {
  contractRevision: typeof MEDIA_VAULT_LIFECYCLE_REVISION;
  availableActions: MediaVaultLifecycleAction[];
};

type Input = {
  role: string;
  lifecycleState: string;
  publicationStatus: string;
  legalHold: boolean;
  retentionDaysRemaining: number | null;
  hasActiveLinks: boolean;
  hasDependentDuplicates: boolean;
  purgeRequestId: string | null;
  purgeRequestStatus: string | null;
};

const confirmation = (
  title: string,
  description: string,
  confirmLabel: string,
  tone: "default" | "danger" = "default",
  input?: MediaVaultLifecycleAction["confirmation"]["input"],
): MediaVaultLifecycleAction["confirmation"] => ({ required: true, title, description, confirmLabel, tone, input });

export function projectMediaVaultLifecycle(input: Input): MediaVaultLifecycleProjection {
  const admin = input.role === "admin";
  const reviewer = admin || input.role === "verifier";
  const quarantined = input.publicationStatus === "quarantined" || input.lifecycleState === "quarantine_retention";
  const retentionActive = (input.retentionDaysRemaining ?? 0) > 0;
  const openPurge = ["pending", "approved", "executing"].includes(String(input.purgeRequestStatus || ""));
  const pendingPurge = input.purgeRequestStatus === "pending";
  const approvedPurge = input.purgeRequestStatus === "approved";

  const unlinkBlocker = !admin
    ? "فصل الروابط يتطلب صلاحية مدير."
    : !input.hasActiveLinks
      ? "لا توجد روابط نشطة أو معلقة لفصلها."
      : null;

  const quarantineBlocker = !reviewer
    ? "الحجر يتطلب صلاحية مدقق أو مدير."
    : input.hasActiveLinks
      ? "الأصل مرتبط بسجل نشط. افصل الارتباط أو حدّث السجل قبل الحجر."
      : quarantined
        ? "الأصل موجود في الحجر بالفعل."
        : null;

  const restoreBlocker = !reviewer
    ? "الاستعادة تتطلب صلاحية مدقق أو مدير."
    : !quarantined
      ? "الأصل ليس في حالة الحجر."
      : input.legalHold
        ? "الحجز القانوني يمنع الاستعادة."
        : null;

  const purgeBlockers = [
    !admin ? "طلب الإتلاف يتطلب صلاحية مدير." : null,
    input.hasActiveLinks ? "توجد روابط نشطة؛ لا يمكن طلب الإتلاف قبل فصلها." : null,
    input.legalHold ? "الحجز القانوني يمنع الإتلاف." : null,
    !quarantined ? "يجب أن يكون الأصل في حالة الحجر أولاً." : null,
    retentionActive ? `باقي ${input.retentionDaysRemaining} يوم من مدة الاحتفاظ النظامية.` : null,
    openPurge ? "يوجد طلب إتلاف مفتوح لهذا الأصل." : null,
    input.hasDependentDuplicates ? "توجد أصول مكررة تعتمد على هذا الأصل؛ لا يمكن إتلافه قبل فك الاعتماد." : null,
  ].filter(Boolean) as string[];

  const reviewBlocker = !admin
    ? "مراجعة طلب الإتلاف تتطلب صلاحية مدير."
    : !pendingPurge
      ? "لا يوجد طلب إتلاف معلق بانتظار المراجعة."
      : null;

  const executeBlocker = !admin
    ? "تنفيذ الإتلاف النهائي يتطلب صلاحية مدير."
    : !approvedPurge || !input.purgeRequestId
      ? "لا يوجد طلب إتلاف موافق عليه وجاهز للتنفيذ."
      : input.hasActiveLinks
        ? "توجد روابط نشطة؛ الإتلاف النهائي غير متاح."
        : input.legalHold
          ? "الحجز القانوني يمنع الإتلاف النهائي."
          : input.hasDependentDuplicates
            ? "توجد أصول مكررة تعتمد على هذا الأصل."
            : null;

  const actions: MediaVaultLifecycleAction[] = [
    {
      action: "unlink",
      label: "فصل الروابط",
      enabled: !unlinkBlocker,
      blockedReason: unlinkBlocker,
      endpoint: "vault",
      requestId: null,
      confirmation: confirmation("فصل روابط الأصل", "ستزال روابط الأصل التشغيلية مع الحفاظ على الأصل وسجل التدقيق.", "فصل الروابط"),
    },
    {
      action: "quarantine",
      label: "نقل إلى الحجر",
      enabled: !quarantineBlocker,
      blockedReason: quarantineBlocker,
      endpoint: "vault",
      requestId: null,
      confirmation: confirmation("نقل الأصل إلى الحجر", "سيبدأ مؤقت الاحتفاظ لمدة 30 يوماً ويُسجل السبب في سجل التدقيق.", "نقل إلى الحجر", "danger", { label: "سبب الحجر", placeholder: "مراجعة تشغيلية", minLength: 5, multiline: true }),
    },
    {
      action: "restore",
      label: "استعادة من الحجر",
      enabled: !restoreBlocker,
      blockedReason: restoreBlocker,
      endpoint: "vault",
      requestId: null,
      confirmation: confirmation("استعادة الأصل", "سيعود الأصل إلى حالته السابقة إذا لم يكن تحت حجز قانوني.", "استعادة"),
    },
    {
      action: "request_purge",
      label: "طلب إتلاف",
      enabled: purgeBlockers.length === 0,
      blockedReason: purgeBlockers.join(" ") || null,
      endpoint: "vault",
      requestId: null,
      confirmation: confirmation("طلب إتلاف الأصل", "ينشئ هذا الإجراء طلب إتلاف مضبوطاً؛ لا يحذف الملف مباشرة.", "إنشاء طلب الإتلاف", "danger", { label: "سبب طلب الإتلاف", placeholder: "انتهاء الحاجة التشغيلية", minLength: 10, multiline: true }),
    },
    {
      action: "approve_purge",
      label: "اعتماد طلب الإتلاف",
      enabled: !reviewBlocker,
      blockedReason: reviewBlocker,
      endpoint: "vault",
      requestId: input.purgeRequestId,
      confirmation: confirmation("اعتماد طلب الإتلاف", "سيصبح الطلب مؤهلاً للتنفيذ النهائي مع بقاء حماية قاعدة البيانات قبل الحذف.", "اعتماد الطلب", "danger", { label: "ملاحظة المراجعة (اختيارية)", multiline: true }),
    },
    {
      action: "reject_purge",
      label: "رفض طلب الإتلاف",
      enabled: !reviewBlocker,
      blockedReason: reviewBlocker,
      endpoint: "vault",
      requestId: input.purgeRequestId,
      confirmation: confirmation("رفض طلب الإتلاف", "سيُغلق الطلب كرفض ويُحفظ سبب القرار في سجل التدقيق.", "رفض الطلب", "danger", { label: "سبب الرفض", minLength: 5, multiline: true }),
    },
    {
      action: "execute_purge",
      label: "تنفيذ الإتلاف النهائي",
      enabled: !executeBlocker,
      blockedReason: executeBlocker,
      endpoint: "purge",
      requestId: input.purgeRequestId,
      confirmation: confirmation("تنفيذ الإتلاف النهائي", "سيُحذف محتوى التخزين بعد إعادة تحقق الخادم من الأهلية، مع حفظ سجل التخلص غير القابل للمحو.", "تنفيذ الإتلاف", "danger", { label: "اكتب إتلاف للتأكيد", requiredValue: "إتلاف" }),
    },
  ];

  return { contractRevision: MEDIA_VAULT_LIFECYCLE_REVISION, availableActions: actions };
}
