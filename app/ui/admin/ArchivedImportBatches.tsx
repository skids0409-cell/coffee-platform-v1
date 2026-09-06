"use client";

import { useEffect, useState } from "react";
import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";
import type { DataImportLifecycleAction, DataImportLifecycleProjection } from "@/lib/data-import-lifecycle-projection";

type DataCenterBatch = {
  id: string;
  batch_code: string;
  source_label: string;
  status: string;
  total_rows: number;
  created_at: string;
  lifecycle?: DataImportLifecycleProjection;
};

export function ArchivedImportBatches() {
  const [batches, setBatches] = useState<DataCenterBatch[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [lifecycleRequest, setLifecycleRequest] = useState<{ batch: DataCenterBatch; action: DataImportLifecycleAction } | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/data-center", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage("تعذر تحميل دفعات الاستيراد المؤرشفة."); return; }
    setBatches((result.batches || []).filter((batch: DataCenterBatch) => batch.status === "archived"));
  };

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const performLifecycleAction = async (batch: DataCenterBatch, action: DataImportLifecycleAction) => {
    setWorking(batch.id);
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: action.apiAction, batchId: batch.id }),
    });
    const result = await response.json().catch(() => ({}));
    setWorking("");
    if (!response.ok) { setMessage(result.reason === "admin_required" ? "المسح النهائي يتطلب صلاحية المدير." : "تعذر تنفيذ العملية على الدفعة."); return false; }
    setMessage(action.action === "restore" ? "أعيدت الدفعة إلى سجل الدفعات النشطة." : `حُذفت الدفعة و${Number(result.deletedRows || 0).toLocaleString("ar-IQ")} من صفوفها الخام.`);
    await load();
    return true;
  };

  const requestLifecycleAction = (batch: DataCenterBatch, action: DataImportLifecycleAction) => {
    if (!action.enabled) return;
    setLifecycleRequest({ batch, action });
  };

  return <section className="inactive-catalog archived-batches" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">Import Archive</span><h2>دفعات الجهات المشاركة المؤرشفة</h2></div><span>{batches.length} دفعة</span></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div data-governed-master="true">
      {batches.map((batch) => <article key={batch.id}><div><b>{batch.source_label}</b><span>{batch.batch_code} · {batch.total_rows} سجل · {new Date(batch.created_at).toLocaleDateString("ar-IQ")}</span></div><div className="queue-actions">{(batch.lifecycle?.availableActions || []).filter((action) => action.action === "restore" || action.action === "delete").map((action) => <button key={action.action} type="button" className={action.action === "delete" ? "danger-action" : undefined} disabled={working === batch.id || !action.enabled} title={action.blockedReason || ""} data-confirmation-mode={action.confirmationMode} onClick={() => requestLifecycleAction(batch, action)}>{action.label}</button>)}</div></article>)}
      {!batches.length && <p>لا توجد دفعات استيراد مؤرشفة حالياً.</p>}
    </div>
    <StandardConfirmDialog open={Boolean(lifecycleRequest)} title={lifecycleRequest?.action.action === "delete" ? "مسح نهائي لدفعة الاستيراد" : "استعادة دفعة الاستيراد"} description={lifecycleRequest?.action.action === "delete" ? lifecycleRequest.batch.lifecycle?.retention.note || "سيُحذف سجل الدفعة وصفوف intake الخام فقط." : "ستعود الدفعة إلى سجل الدفعات النشطة وفق حالتها السابقة."} confirmLabel={lifecycleRequest?.action.label || "تأكيد"} tone={lifecycleRequest?.action.action === "delete" ? "danger" : "default"} input={lifecycleRequest?.action.confirmationMode === "typed" ? { label: "رمز الدفعة", placeholder: lifecycleRequest.batch.batch_code, requiredValue: lifecycleRequest.batch.batch_code } : undefined} busy={lifecycleBusy} onCancel={() => { if (!lifecycleBusy) setLifecycleRequest(null); }} onConfirm={async () => { if (!lifecycleRequest) return; setLifecycleBusy(true); try { const ok = await performLifecycleAction(lifecycleRequest.batch, lifecycleRequest.action); if (ok) setLifecycleRequest(null); } finally { setLifecycleBusy(false); } }} />
  </section>;
}
