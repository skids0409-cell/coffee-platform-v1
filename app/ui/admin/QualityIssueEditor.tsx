"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";

export type QualityIssueView = {
  id: string;
  entity: string;
  entityId: string | null;
  label: string;
  reason: string;
  severity: string;
  recommendedAction?: string | null;
  issueDetails?: {
    issueCode: string;
    issueType: string | null;
    fieldCode: string | null;
    message: string;
    createdAt: string;
    batchCode: string | null;
    sourceLabel: string | null;
    sourceRowNumber: number | null;
    rawPayload: Record<string, unknown> | null;
    normalizedPayload: Record<string, unknown> | null;
  };
};

type QualityIssueEditorProps = {
  issue: QualityIssueView;
  candidates: Array<{ entity: string; id: string; label: string }>;
  canDecide: boolean;
  onClose: () => void;
  onUpdated: (data: any) => void;
};

export function QualityIssueEditor({ issue, candidates, canDecide, onClose, onUpdated }: QualityIssueEditorProps) {
  const [target, setTarget] = useState(issue.entityId ? `${issue.entity}:${issue.entityId}` : "");
  const [status, setStatus] = useState("open");
  const [resolutionNote, setResolutionNote] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canDecide) { setMessage("هذه العملية تحتاج صلاحية المراجع أو المدير."); return; }
    if (status !== "open" && resolutionNote.trim().length < 10) { setMessage("اكتب سبب القرار أو الإجراء المنفذ بعشرة أحرف على الأقل."); return; }
    const [targetEntity, targetId] = target ? target.split(":") : ["", ""];
    setWorking(true);
    setMessage("جارٍ توثيق القرار…");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "process_quality_issue",
        id: issue.id,
        status,
        resolutionNote,
        targetEntity: targetEntity || null,
        targetId: targetId || null,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking(false);
    if (!response.ok) {
      setMessage(data.reason === "target_not_found"
        ? "السجل المختار لم يعد موجوداً."
        : data.reason === "verifier_required"
          ? "هذه العملية تحتاج صلاحية المراجع أو المدير."
          : "تعذر حفظ القرار؛ تحقق من الحقول ثم حاول مجدداً.");
      return;
    }
    onUpdated(data);
    onClose();
  };

  const details = issue.issueDetails;
  return <div className="record-editor-backdrop" role="dialog" aria-modal="true" aria-label="تفاصيل ملاحظة الجودة" data-governed-inspector="true">
    <section className="record-editor quality-issue-modal">
      <div className="section-head"><div><span className={`quality-severity ${issue.severity}`}>{issue.severity}</span><h2>{issue.label}</h2></div><button type="button" onClick={onClose}>إغلاق</button></div>
      <p>{details?.message || issue.reason}</p>
      {issue.recommendedAction && <div className="quality-recommendation"><b>الإجراء المقترح</b><span>{issue.recommendedAction}</span></div>}
      <dl className="quality-issue-metadata">
        <div><dt>رمز الملاحظة</dt><dd>{details?.issueCode || issue.id}</dd></div>
        <div><dt>نوعها</dt><dd>{details?.issueType || "عام"}</dd></div>
        <div><dt>الحقل</dt><dd>{details?.fieldCode || "غير محدد"}</dd></div>
        <div><dt>دفعة الإدخال</dt><dd>{details?.batchCode || "ليست ضمن دفعة"}</dd></div>
        <div><dt>المصدر</dt><dd>{details?.sourceLabel || "غير محدد"}</dd></div>
        <div><dt>رقم الصف</dt><dd>{details?.sourceRowNumber || "—"}</dd></div>
      </dl>
      {details?.rawPayload && <details className="quality-payload"><summary>عرض البيانات الأصلية الواردة</summary><pre>{JSON.stringify(details.rawPayload, null, 2)}</pre></details>}
      <form className="catalog-draft-form quality-decision-form" onSubmit={save}>
        <label className="wide">ربط الملاحظة بسجل<select value={target} onChange={(event) => setTarget(event.target.value)}><option value="">تبقى ملاحظة عامة غير مرتبطة</option>{candidates.map((item) => <option key={`${item.entity}:${item.id}`} value={`${item.entity}:${item.id}`}>{item.label} — {item.entity}</option>)}</select></label>
        <label>القرار<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="open">تبقى مفتوحة</option><option value="fixed">تم التصحيح</option><option value="accepted">مقبولة بقرار إداري</option><option value="dismissed">تنبيه غير منطبق</option></select></label>
        <label className="wide">سبب القرار أو الإجراء<textarea value={resolutionNote} onChange={(event) => setResolutionNote(event.target.value)} placeholder="اكتب ما تم التحقق منه أو سبب القرار…" /></label>
        {message && <p className="admin-message wide" role="status">{message}</p>}
        <div className="queue-actions wide"><button type="submit" disabled={working || !canDecide}>{working ? "جارٍ الحفظ…" : "حفظ القرار وتوثيقه"}</button><button type="button" onClick={onClose}>إلغاء</button></div>
      </form>
    </section>
  </div>;
}
