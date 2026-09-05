"use client";

import { PendingAssetReviewConsole } from "@/app/ui/admin/PendingAssetReviewBridge";

export type ReviewQueueRow = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  ready: boolean;
  blockers: string[];
  warnings: string[];
};

export type ReviewQueues = Record<string, ReviewQueueRow[]>;

type ReviewWorkspaceProps = {
  queues: ReviewQueues;
  role: string;
  workingId: string;
  statusLabels: Record<string, string>;
  onOpenRecord: (record: { entity: string; id: string }) => void;
  onSetStatus: (table: string, id: string, status: string, overrideReason?: string) => void;
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
  onOpenRecord,
  onSetStatus,
  onProcessRights,
  onDeleteRecord,
}: ReviewWorkspaceProps) {
  const canVerify = ["verifier", "admin"].includes(role);

  return <div className="review-queues" id="operations-review" data-workspace-contract="master-detail-v1">
    <PendingAssetReviewConsole />
    {queueSections.filter(([key]) => (queues[key]?.length || 0) > 0).map(([key, label]) => (
      <section key={key} data-governed-master="true">
        <h3>{label} <span>{queues[key]?.length || 0}</span></h3>
        {key === "rights" && <p className="rights-workflow-note">«طلب دليل إضافي» يغيّر حالة الطلب ويثبتها في السجل. في MVP لا يرسل النظام بريداً تلقائياً؛ استخدم بيانات التواصل الظاهرة ثم أعد الطلب إلى «قيد المراجعة» عند وصول الدليل.</p>}
        {queues[key].map((row) => <article key={row.id}>
          <div>
            <div className="queue-title">
              <b>{row.label}</b>
              <span className={row.ready ? "readiness ready" : "readiness blocked"}>{row.ready ? "جاهز للاعتماد" : "غير جاهز"}</span>
            </div>
            <span>{statusLabels[row.status] || row.status} · {row.evidence}</span>
            {row.blockers.length > 0 && <ul className="queue-notes blockers">{row.blockers.map((note) => <li key={note}>{note}</li>)}</ul>}
            {row.warnings.length > 0 && <ul className="queue-notes warnings">{row.warnings.map((note) => <li key={note}>{note}</li>)}</ul>}
          </div>

          {key === "beta" && <div className="queue-actions">
            {row.status === "new" && <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus("beta_feedback", row.id, "triaged")}>بدء المعالجة</button>}
            {["triaged", "in_progress"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus("beta_feedback", row.id, "resolved")}>إغلاق بعد الإصلاح</button>}
            <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus("beta_feedback", row.id, "duplicate")}>مكرر</button>
          </div>}

          {key === "rights" && canVerify && <div className="queue-actions rights-actions">
            {row.status !== "in_review" && <button type="button" disabled={workingId === row.id} onClick={() => onProcessRights(row.id, "in_review")}>{row.status === "submitted" ? "بدء المراجعة" : "استئناف المراجعة بعد وصول الدليل"}</button>}
            {row.status !== "needs_evidence" && <button type="button" disabled={workingId === row.id} onClick={() => onProcessRights(row.id, "needs_evidence")}>طلب دليل إضافي</button>}
            {row.status === "in_review" && <><button type="button" disabled={workingId === row.id} onClick={() => onProcessRights(row.id, "approved")}>قبول وإغلاق</button><button type="button" disabled={workingId === row.id} onClick={() => onProcessRights(row.id, "rejected")}>رفض مع السبب</button></>}
          </div>}

          {!["rights", "beta", "support"].includes(key) && <div className="queue-actions">
            <button type="button" onClick={() => onOpenRecord({ entity: entityFor(key), id: row.id })}>فتح وتدقيق</button>
            {row.status === "draft" && <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus(entityFor(key), row.id, "in_review")}>إرسال للمراجعة</button>}
            {row.status === "in_review" && canVerify && <button type="button" disabled={workingId === row.id || !row.ready} title={!row.ready ? "أغلق النواقص الظاهرة قبل النشر" : ""} onClick={() => onSetStatus(entityFor(key), row.id, "published")}>اعتماد للنشر</button>}
            {row.status === "in_review" && !row.ready && role === "admin" && <button type="button" className="admin-override" disabled={workingId === row.id} onClick={() => { const reason = window.prompt("اكتب سبب التجاوز الإداري بوضوح (10 أحرف على الأقل). سيُحفظ في سجل التدقيق:"); if (reason && reason.trim().length >= 10) onSetStatus(entityFor(key), row.id, "published", reason.trim()); }}>اعتماد إداري مع توثيق السبب</button>}
            {["in_review", "rejected"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus(entityFor(key), row.id, "draft")}>إعادة لمسودة</button>}
            {canVerify && <button type="button" disabled={workingId === row.id} onClick={() => onSetStatus(entityFor(key), row.id, "rejected")}>رفض</button>}
            {row.status !== "published" && role === "admin" && <button type="button" className="danger-action" disabled={workingId === row.id} onClick={() => onDeleteRecord(entityFor(key), row.id, row.label)}>حذف نهائي</button>}
          </div>}
        </article>)}
      </section>
    ))}
  </div>;
}
