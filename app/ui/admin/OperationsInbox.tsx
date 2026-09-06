"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type WorkSource = "quality" | "rights" | "support" | "partner";

type WorkItem = {
  key: string;
  source: WorkSource;
  sourceId: string;
  reference: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  deepLink: string;
};

type WorkQueueResponse = {
  authenticated: boolean;
  counts?: Record<WorkSource, number>;
  items?: WorkItem[];
  reason?: string;
};

const sourceLabel: Record<WorkSource, string> = {
  quality: "جودة البيانات",
  rights: "طلبات الحقوق",
  support: "الدعم والمساعدة",
  partner: "طلبات الجهات",
};

export function OperationsInbox() {
  const [state, setState] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [counts, setCounts] = useState<Record<WorkSource, number>>({ quality: 0, rights: 0, support: 0, partner: 0 });
  const [source, setSource] = useState<WorkSource | "all">("all");

  const load = async () => {
    setState("loading");
    const response = await fetch("/api/admin/work-queue", { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) { setState("signed_out"); return; }
    const data = await response.json() as WorkQueueResponse;
    if (!response.ok) { setState("error"); return; }
    setItems(data.items || []);
    setCounts(data.counts || { quality: 0, rights: 0, support: 0, partner: 0 });
    setState("ready");
  };

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const visible = useMemo(() => source === "all" ? items : items.filter((item) => item.source === source), [items, source]);

  return <section className="operations-inbox" data-workspace-contract="master-detail-v1">
    <div className="section-head">
      <div><span className="eyebrow">Unified Operational Work Queue</span><h2>صندوق العمل التشغيلي</h2></div>
      <Link href="/operations">العودة إلى مركز التشغيل</Link>
    </div>
    <p>عرض موحد للمهام المفتوحة فقط. القرار والتعديل يبقيان دائماً داخل مساحة العمل المالكة للسجل الأصلي.</p>

    <div className="operations-inbox-summary" aria-label="ملخص صندوق العمل">
      <button type="button" className={source === "all" ? "active" : ""} onClick={() => setSource("all")}><b>{items.length}</b><span>الكل</span></button>
      {(Object.keys(sourceLabel) as WorkSource[]).map((key) => <button type="button" key={key} className={source === key ? "active" : ""} onClick={() => setSource(key)}><b>{counts[key]}</b><span>{sourceLabel[key]}</span></button>)}
    </div>

    {state === "loading" && <p role="status">جارٍ تحميل صندوق العمل…</p>}
    {state === "signed_out" && <div className="directory-state compact"><h3>انتهت جلسة التشغيل</h3><p>سجّل الدخول من مركز التشغيل ثم افتح صندوق العمل مجدداً.</p><Link href="/operations">فتح مركز التشغيل</Link></div>}
    {state === "error" && <div className="directory-state compact"><h3>تعذر تحميل صندوق العمل</h3><p>لم يتم تغيير أي سجل. أعد المحاولة.</p><button type="button" onClick={() => void load()}>إعادة المحاولة</button></div>}

    {state === "ready" && <div className="operations-inbox-list" data-governed-master="true">
      {visible.map((item) => <article key={item.key} className={`operations-inbox-item source-${item.source}`}>
        <div>
          <span className="entity-kind-badge">{sourceLabel[item.source]}</span>
          <b>{item.title}</b>
          <span>{item.reference} · {item.status} · أولوية {item.priority}</span>
          <p>{item.summary}</p>
          <small>آخر تحديث {new Date(item.updatedAt).toLocaleString("ar-IQ")}</small>
        </div>
        <Link href={item.deepLink}>فتح في مساحة العمل المالكة</Link>
      </article>)}
      {!visible.length && <p>لا توجد مهام مفتوحة ضمن هذا المصدر.</p>}
    </div>}
  </section>;
}
