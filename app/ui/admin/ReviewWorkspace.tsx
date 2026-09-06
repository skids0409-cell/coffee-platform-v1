"use client";

import { useEffect } from "react";
import { PendingAssetReviewConsole } from "@/app/ui/admin/PendingAssetReviewConsole";
import type { ReviewLifecycleAction, ReviewLifecycleProjection } from "@/lib/review-lifecycle-projection";
import type { RightsLifecycleAction, RightsLifecycleProjection } from "@/lib/rights-lifecycle-projection";
import type { BetaLifecycleAction, BetaLifecycleProjection } from "@/lib/beta-lifecycle-projection";

export type ReviewQueueRow = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  ready: boolean;
  blockers: string[];
  warnings: string[];
  lifecycle?: ReviewLifecycleProjection;
  rightsLifecycle?: RightsLifecycleProjection;
  betaLifecycle?: BetaLifecycleProjection;
};

export type ReviewQueues = Record<string, ReviewQueueRow[]>;

type ReviewWorkspaceProps = {
  queues: ReviewQueues;
  role: string;
  workingId: string;
  statusLabels: Record<string, string>;
  focusId?: string;
  onOpenRecord: (record: { entity: string; id: string }) => void;
  onSetStatus: (table: string, id: string, status: string) => void;
  onAdminOverride: (table: string, id: string, label: string) => void;
  onProcessRights: (id: string, status: string) => void;
  onDeleteRecord: (table: string, id: string, label: string) => void;
};

const queueSections = [
  ["products", "المنتجات"],
  ["brands", "العلامات التجارية"],
  ["organizations", "الجهات"],
  ["offers", "العروض"],
  ["contents", "المحتوى"],
  ["origins", "مصادر القهوة"],
  ["beta", "ملاحظات الاختبار"],
  ["rights", "طلبات الحقوق"],
] as const;

const entityFor = (key: string) => key === "origins" ? "origin_claims" : key;

export function ReviewWorkspace({
  queues,
  role,
  workingId,
  statusLabels,
  focusId = "",
  onOpenRecord,
  onSetStatus,
  onAdminOverride,
  onProcessRights,
  onDeleteRecord,
}: ReviewWorkspaceProps) {
  useEffect(() => {
    if (!focusId) return;
    const handle = window.setTimeout(() => document.getElementById(`review-queue-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return () => window.clearTimeout(handle);
  }, [focusId]);

  const runProjectedAction = (key: string, row: ReviewQueueRow, action: ReviewLifecycleAction) => {
    const entity = entityFor(key);
    switch (action.action) {
      case "open":
        onOpenRecord({ entity, id: row.id });
        return;
      case "admin_override_publish":
        onAdminOverride(entity, row.id, row.label);
        return;
      case "delete":
        onDeleteRecord(entity, row.id, row.label);
        return;
      case "submit_review":
      case "publish":
      case "return_draft":
      case "reject":
        if (action.targetStatus) onSetStatus(entity, row.id, action.targetStatus);
        return;
    }
  };

  const runProjectedRightsAction = (row: ReviewQueueRow, action: RightsLifecycleAction) => {
    if (action.enabled) onProcessRights(row.id, action.targetStatus);
  };

  const runProjectedBetaAction = (row: ReviewQueueRow, action: BetaLifecycleAction) => {
    if (action.enabled) onSetStatus("beta_feedback", row.id, action.targetStatus);
  };

  return <div className="review-queues" id="operations-review" data-workspace-contract="master-detail-v1" data-review-role={role}>
    <PendingAssetReviewConsole />
    {queueSections.filter(([key]) => (queues[key]?.length || 0) > 0).map(([key, label]) => (
      <section key={key} data-governed-master="true">
        <h3>{label} <span>{queues[key]?.length || 0}</span></h3>
        {key === "rights" && <p className="rights-workflow-note">«طلب دليل إضافي» يغيّر حالة الطلب ويثبتها في السجل. في MVP لا يرسل النظام بريداً تلقائياً؛ استخدم بيانات التواصل الظاهرة ثم أعد الطلب إلى «قيد المراجعة» عند وصول الدليل.</p>}
        {queues[key].map((row) => <article key={row.id} id={`review-queue-${row.id}`} className={focusId === row.id ? "work-queue-focus" : undefined}>
          <div>
            <div className="queue-title">
              <b>{row.label}</b>
              <span className={row.ready ? "readiness ready" : "readiness blocked"}>{row.ready ? "جاهز للاعتماد" : "غير جاهز"}</span>
            </div>
            <span>{statusLabels[row.status] || row.status} · {row.evidence}</span>
            {row.blockers.length > 0 && <ul className="queue-notes blockers">{row.blockers.map((note) => <li key={note}>{note}</li>)}</ul>}
            {row.warnings.length > 0 && <ul className="queue-notes warnings">{row.warnings.map((note) => <li key={note}>{note}</li>)}</ul>}
          </div>

          {key === "beta" && <div className="queue-actions" data-lifecycle-revision={row.betaLifecycle?.contractRevision || "missing"}>
            {(row.betaLifecycle?.availableActions || []).map((action) => (
              <button
                key={action.action}
                type="button"
                disabled={workingId === row.id || !action.enabled}
                title={action.blockedReason || ""}
                data-confirmation-mode={action.confirmationMode}
                onClick={() => runProjectedBetaAction(row, action)}
              >
                {action.label}
              </button>
            ))}
          </div>}

          {key === "rights" && <div className="queue-actions rights-actions" data-lifecycle-revision={row.rightsLifecycle?.contractRevision || "missing"}>
            {(row.rightsLifecycle?.availableActions || []).map((action) => (
              <button
                key={action.action}
                type="button"
                disabled={workingId === row.id || !action.enabled}
                title={action.blockedReason || ""}
                data-confirmation-mode={action.confirmationMode}
                onClick={() => runProjectedRightsAction(row, action)}
              >
                {action.label}
              </button>
            ))}
          </div>}

          {!["rights", "beta", "support"].includes(key) && <div className="queue-actions" data-lifecycle-revision={row.lifecycle?.contractRevision || "missing"}>
            {(row.lifecycle?.availableActions || []).map((action) => (
              <button
                key={action.action}
                type="button"
                className={action.action === "delete" ? "danger-action" : action.action === "admin_override_publish" ? "admin-override" : undefined}
                disabled={action.action === "open" ? !action.enabled : workingId === row.id || !action.enabled}
                title={action.blockedReason || ""}
                data-confirmation-mode={action.confirmationMode}
                onClick={() => runProjectedAction(key, row, action)}
              >
                {action.label}
              </button>
            ))}
          </div>}
        </article>)}
      </section>
    ))}
  </div>;
}
