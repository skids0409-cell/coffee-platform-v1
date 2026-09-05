"use client";

import { useEffect, useState } from "react";

type DataCenterBatch = {
  id: string;
  batch_code: string;
  source_label: string;
  status: string;
  total_rows: number;
  created_at: string;
};

export function ArchivedImportBatches() {
  const [batches, setBatches] = useState<DataCenterBatch[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");

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

  const act = async (batch: DataCenterBatch, action: "restore_batch" | "delete_archived_batch") => {
    if (action === "delete_archived_batch") {
      const confirmation = window.prompt(`سيُحذف سجل الدفعة وصفوفه الخام نهائياً، ولن تُحذف الجهات الناتجة عنه. اكتب رمز الدفعة للتأكيد:\n${batch.batch_code}`);
      if (confirmation?.trim() !== batch.batch_code) return;
    }
    setWorking(batch.id);
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, batchId: batch.id }),
    });
    const result = await response.json().catch(() => ({}));
    setWorking("");
    if (!response.ok) { setMessage("تعذر تنفيذ العملية على الدفعة."); return; }
    setMessage(action === "restore_batch" ? "أعيدت الدفعة إلى سجل الدفعات النشطة." : `حُذفت الدفعة و${Number(result.deletedRows || 0).toLocaleString("ar-IQ")} من صفوفها الخام.`);
    await load();
  };

  return <section className="inactive-catalog archived-batches" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">Import Archive</span><h2>دفعات الجهات المشاركة المؤرشفة</h2></div><span>{batches.length} دفعة</span></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div data-governed-master="true">
      {batches.map((batch) => <article key={batch.id}><div><b>{batch.source_label}</b><span>{batch.batch_code} · {batch.total_rows} سجل · {new Date(batch.created_at).toLocaleDateString("ar-IQ")}</span></div><div className="queue-actions"><button type="button" disabled={working === batch.id} onClick={() => act(batch, "restore_batch")}>استعادة إلى سجل الدفعات</button><button type="button" className="danger-action" disabled={working === batch.id} onClick={() => act(batch, "delete_archived_batch")}>مسح نهائي</button></div></article>)}
      {!batches.length && <p>لا توجد دفعات استيراد مؤرشفة حالياً.</p>}
    </div>
  </section>;
}
