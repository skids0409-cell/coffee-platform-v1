export const TAXONOMY_LIFECYCLE_REVISION = "taxonomy.lifecycle.v1";

export type TaxonomyStatus = "draft" | "in_review" | "published" | "archived" | "rejected";
export type TaxonomyLifecycleAction = {
  action: "transition_status";
  targetStatus: TaxonomyStatus;
  label: string;
  enabled: boolean;
  blockedReason: string | null;
  confirmation: {
    title: string;
    description: string;
    confirmLabel: string;
    tone: "default" | "danger";
    input: { label: string; minLength: number; multiline: boolean };
  };
};
export type TaxonomyLifecycleProjection = {
  contractRevision: typeof TAXONOMY_LIFECYCLE_REVISION;
  availableActions: TaxonomyLifecycleAction[];
};

const transitions: Record<TaxonomyStatus, TaxonomyStatus[]> = {
  draft: ["in_review"],
  in_review: ["published", "rejected", "draft"],
  published: ["archived"],
  archived: ["draft"],
  rejected: ["draft"],
};
const labels: Record<TaxonomyStatus, string> = {
  draft: "إعادة لمسودة",
  in_review: "إرسال للمراجعة",
  published: "نشر",
  archived: "أرشفة",
  rejected: "رفض",
};

export function projectTaxonomyLifecycle(status: TaxonomyStatus): TaxonomyLifecycleProjection {
  return {
    contractRevision: TAXONOMY_LIFECYCLE_REVISION,
    availableActions: transitions[status].map((targetStatus) => ({
      action: "transition_status",
      targetStatus,
      label: labels[targetStatus],
      enabled: true,
      blockedReason: null,
      confirmation: {
        title: `تأكيد ${labels[targetStatus]}`,
        description: targetStatus === "published"
          ? "سيصبح تعريف التصنيف فعالاً في واجهات الاكتشاف بعد تحقق الخادم من الانتقال."
          : "سيُسجل سبب القرار وتتحقق قاعدة البيانات من الانتقال والتزامن قبل التنفيذ.",
        confirmLabel: labels[targetStatus],
        tone: targetStatus === "rejected" || targetStatus === "archived" ? "danger" : "default",
        input: { label: "سبب القرار (10 أحرف على الأقل)", minLength: 10, multiline: true },
      },
    })),
  };
}
