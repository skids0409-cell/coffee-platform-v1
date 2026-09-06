"use client";

import Link from "next/link";
import { useState } from "react";
import { DataCenterWorkspace, type DataCenterReference } from "@/app/ui/admin/DataCenterWorkspace";
import { CatalogDraftWorkspace } from "@/app/ui/admin/CatalogDraftWorkspace";

type LegacyMode = "entry" | "imports";

export function LegacyDataCenterRollback() {
  const [mode, setMode] = useState<LegacyMode>("entry");
  const [revision, setRevision] = useState(0);

  const refresh = async () => {
    setRevision((value) => value + 1);
  };

  const renderEntry = (reference: DataCenterReference, reload: () => Promise<void>) => (
    <CatalogDraftWorkspace reference={reference} onCreated={reload} />
  );

  return (
    <main className="operations" data-legacy-data-center="rollback-only" data-cutover-target="/operations/data-center-v2">
      <section className="admin-review-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">Legacy Freeze · rollback only</span>
            <h2>مركز البيانات القديم — مسار استرجاع مؤقت</h2>
            <p>هذا المسار ليس نقطة دخول تشغيلية. استخدمه فقط عند الحاجة إلى rollback أثناء نافذة القطع.</p>
          </div>
          <Link className="primary" href="/operations/data-center-v2">العودة إلى Data Center V2</Link>
        </div>
        <div className="operations-workspace-nav" aria-label="أقسام rollback القديمة">
          <button type="button" className={mode === "entry" ? "active" : ""} onClick={() => setMode("entry")}>الإدخال القديم</button>
          <button type="button" className={mode === "imports" ? "active" : ""} onClick={() => setMode("imports")}>الاستيراد القديم</button>
        </div>
        <div className="admin-message" role="status">
          Legacy Freeze مفعّل. لا تُضاف أي capability جديدة هنا، ولا يُعد هذا المسار مرجعاً لتطوير V2.
        </div>
        <div key={`${mode}:${revision}`}>
          {mode === "entry"
            ? <DataCenterWorkspace mode="entry" onChanged={refresh} renderEntry={renderEntry} />
            : <DataCenterWorkspace mode="imports" onChanged={refresh} />}
        </div>
      </section>
    </main>
  );
}
