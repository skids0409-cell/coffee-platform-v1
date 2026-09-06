"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";
import { CatalogIntakeV2 } from "@/app/ui/admin/data-center-v2/CatalogIntakeV2";
import type { DataImportLifecycleAction, DataImportLifecycleProjection } from "@/lib/data-import-lifecycle-projection";
import styles from "./DataCenterV2.module.css";

type View = "overview" | "intake" | "catalog" | "batches" | "handoffs" | "client";

type Batch = {
  id: string;
  batch_code: string;
  entity_type: string;
  source_label: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  created_at: string;
  imported_at: string | null;
  lifecycle?: DataImportLifecycleProjection;
};

type ReferenceData = {
  categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null; catalog_product_kind: string | null }>;
  organizations: Array<{ id: string; name_ar: string; status: string; organization_roles?: Array<{ role_type: string }> }>;
  products: Array<{ id: string; name_ar: string; status: string; product_kind: string }>;
  brands: Array<{ id: string; name_ar: string; product_kinds?: string[] }>;
  countries: Array<{ code: string; name_ar: string; coffee_regions?: Array<{ id: string; name_ar: string }> }>;
  filterDefinitions: Array<{ id: string; name_ar: string }>;
};

type PreviewRow = {
  sourceRowNumber: number;
  normalized: { name_ar: string; address_ar: string; contact: string | null; role_type?: string };
  status: "valid" | "warning" | "invalid";
  messages: string[];
};

type BatchDetails = {
  batch: Batch;
  rows: Array<{
    id: string;
    source_row_number: number;
    normalized_payload: Record<string, unknown>;
    validation_status: string;
    validation_messages: string[];
    target_table: string | null;
    target_id: string | null;
  }>;
};

type DataCenterPayload = {
  authenticated?: boolean;
  marketId?: string | null;
  batches?: Batch[];
  referenceData?: ReferenceData;
  reason?: string;
};

type MirrorProbe = {
  key: string;
  label: string;
  endpoint: string;
  state: "idle" | "loading" | "ok" | "error";
  count: number | null;
};

const mirrorDefinitions: Array<Omit<MirrorProbe, "state" | "count">> = [
  { key: "products", label: "المنتجات العامة", endpoint: "/api/public-products" },
  { key: "directory", label: "دليل الجهات", endpoint: "/api/public-directory" },
  { key: "search", label: "البحث العام", endpoint: "/api/public-search?q=%D9%82%D9%87%D9%88%D8%A9" },
];

const emptyReference: ReferenceData = {
  categories: [],
  organizations: [],
  products: [],
  brands: [],
  countries: [],
  filterDefinitions: [],
};

const navItems: Array<{ id: View; label: string; description: string }> = [
  { id: "overview", label: "لوحة القيادة", description: "حالة الإدخال والحوكمة" },
  { id: "intake", label: "الإدخال", description: "CSV وسجل جهة واحد" },
  { id: "catalog", label: "إدخال الكتالوج", description: "المنتجات والعروض والمحتوى والمنشأ" },
  { id: "batches", label: "دفعات الاستيراد", description: "المعاينة ودورة الحياة" },
  { id: "handoffs", label: "مسارات الحوكمة", description: "المراجعة والوسائط والبحث والدعم" },
  { id: "client", label: "مرآة العميل", description: "فحص واجهات النشر العامة" },
];

const validationStatusLabel = (status: string) => ({ valid: "صالح", warning: "تحذير", invalid: "غير صالح" }[status] || status);

const batchStatusLabel = (status: string) => ({
  ready: "جاهزة للتحويل",
  imported: "تم الاستيراد",
  rejected: "مرفوضة",
  archived: "مؤرشفة",
  draft: "مسودة",
  validating: "قيد الفحص",
}[status] || status);

function getCount(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  for (const key of ["items", "results", "products", "organizations", "data"]) {
    if (Array.isArray(object[key])) return object[key].length;
  }
  for (const key of ["count", "total", "total_count"]) {
    if (typeof object[key] === "number") return object[key] as number;
  }
  return null;
}

export function DataCenterV2App() {
  const [view, setView] = useState<View>("overview");
  const [state, setState] = useState<"loading" | "ready" | "signed_out" | "error">("loading");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [reference, setReference] = useState<ReferenceData>(emptyReference);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [details, setDetails] = useState<BatchDetails | null>(null);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [confirmRequest, setConfirmRequest] = useState<{ batch: Batch; action: DataImportLifecycleAction } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [csvFileName, setCsvFileName] = useState("لم يتم اختيار ملف");
  const [mirror, setMirror] = useState<MirrorProbe[]>(() => mirrorDefinitions.map((probe) => ({ ...probe, state: "idle", count: null })));

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/data-center", { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({})) as DataCenterPayload;
    if (response.status === 401) {
      setState("signed_out");
      return;
    }
    if (!response.ok) throw new Error(payload.reason || "data_center_load_failed");
    setBatches(Array.isArray(payload.batches) ? payload.batches : []);
    setReference(payload.referenceData || emptyReference);
    setState("ready");
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;
      const allowedViews: View[] = ["overview", "intake", "catalog", "batches", "handoffs", "client"];
      if (requestedView && allowedViews.includes(requestedView)) setView(requestedView);
      void load().catch(() => setState("error"));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const stats = useMemo(() => {
    const active = batches.filter((batch) => batch.status !== "archived");
    return {
      active: active.length,
      ready: active.filter((batch) => batch.status === "ready").length,
      completed: active.filter((batch) => ["imported", "rejected"].includes(batch.status)).length,
      rejectedRows: active.reduce((total, batch) => total + Number(batch.rejected_rows || 0), 0),
    };
  }, [batches]);

  const submitCsv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("csvFile");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      setMessage("اختر ملف CSV صالحاً.");
      return;
    }
    setWorking("csv");
    setMessage("جارٍ فحص الملف وربطه بسجل مصدر موثق…");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "stage_csv",
        csvText: await file.text(),
        marketCode: "IQ-BGD",
        sourceLabel: String(form.get("sourceLabel") || ""),
        sourceConfirmed: form.get("sourceConfirmed") === "on",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");
    setPreview(Array.isArray(data.preview) ? data.preview : []);
    if (!response.ok) {
      setMessage("تعذر تجهيز الدفعة. راجع المصدر والملف والحقول المطلوبة.");
      return;
    }
    setBatches(Array.isArray(data.batches) ? data.batches : []);
    formElement.reset();
    setCsvFileName("لم يتم اختيار ملف");
    setMessage("تم تجهيز الدفعة دون نشر أي سجل. راجع النتائج ثم نفّذ الإجراء الذي يعيده عقد الخادم فقط.");
  };

  const submitManualOrganization = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking("manual");
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_manual_draft",
        name: String(form.get("name") || ""),
        address: String(form.get("address") || ""),
        contact: String(form.get("contact") || ""),
        roleType: String(form.get("roleType") || "cafe"),
        marketCode: "IQ-BGD",
        sourceLabel: String(form.get("sourceLabel") || ""),
        sourceConfirmed: form.get("sourceConfirmed") === "on",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");
    setPreview(Array.isArray(data.preview) ? data.preview : []);
    if (!response.ok) {
      setMessage("تعذر إنشاء المسودة. لم يتم نشر أي شيء.");
      return;
    }
    setBatches(Array.isArray(data.batches) ? data.batches : []);
    formElement.reset();
    setMessage("تم إنشاء مسودة جهة موثقة. النشر يبقى محكوماً بطابور المراجعة والاعتماد.");
  };

  const openBatch = async (batch: Batch) => {
    setWorking(`details:${batch.id}`);
    const response = await fetch(`/api/admin/data-center?batchId=${encodeURIComponent(batch.id)}`, { cache: "no-store", credentials: "same-origin" });
    const payload = await response.json().catch(() => ({}));
    setWorking("");
    if (!response.ok) {
      setMessage("تعذر تحميل تفاصيل الدفعة.");
      return;
    }
    setDetails(payload as BatchDetails);
  };

  const executeLifecycle = async (batch: Batch, action: DataImportLifecycleAction) => {
    if (!action.enabled) return;
    setConfirmBusy(true);
    setWorking(`action:${batch.id}`);
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: action.apiAction, batchId: batch.id }),
    });
    const payload = await response.json().catch(() => ({}));
    setConfirmBusy(false);
    setWorking("");
    setConfirmRequest(null);
    if (!response.ok) {
      setMessage("رفض الخادم العملية وفق حالة الدفعة أو الصلاحية الحالية.");
      return;
    }
    setBatches(Array.isArray(payload.batches) ? payload.batches : []);
    setDetails(null);
    setMessage(action.action === "import" ? "تم إنشاء مسودات فقط؛ لم ينتقل أي سجل إلى العميل دون المراجعة والنشر." : "تم تنفيذ انتقال الدفعة وتسجيله عبر الحد الخادمي المعتمد.");
  };

  const runMirror = useCallback(async () => {
    setMirror(mirrorDefinitions.map((probe) => ({ ...probe, state: "loading", count: null })));
    const next = await Promise.all(mirrorDefinitions.map(async (probe) => {
      try {
        const response = await fetch(probe.endpoint, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        return { ...probe, state: response.ok ? "ok" as const : "error" as const, count: response.ok ? getCount(payload) : null };
      } catch {
        return { ...probe, state: "error" as const, count: null };
      }
    }));
    setMirror(next);
  }, []);

  useEffect(() => {
    if (state !== "ready") return;
    const initial = window.setTimeout(() => void runMirror(), 0);
    const interval = window.setInterval(() => void runMirror(), 60_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void runMirror(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, runMirror]);

  if (state === "loading") return <div className={styles.root}><div className={styles.notice}>جارٍ تحميل Data Center V2 من العقود الخادمية الحالية…</div></div>;

  if (state === "signed_out") return <div className={styles.root}><div className={styles.notice} data-tone="danger"><b>الجلسة الإدارية غير متاحة.</b><p>سجّل الدخول من مركز العمليات ثم عد إلى المسار الجديد.</p><Link className={styles.linkButton} href="/operations?workspace=dashboard">العودة إلى تسجيل الدخول</Link></div></div>;

  if (state === "error") return <div className={styles.root}><div className={styles.notice} data-tone="danger"><b>تعذر تحميل مركز البيانات V2.</b><p>لم يتم تنفيذ أي mutation. أعد المحاولة بعد التحقق من جلسة الإدارة والخدمات الخادمية.</p><button className={styles.primary} type="button" onClick={() => { setState("loading"); void load().catch(() => setState("error")); }}>إعادة المحاولة</button></div></div>;

  const activeBatches = batches.filter((batch) => batch.status !== "archived");

  return (
    <div className={styles.root} data-contract="data-center.v2" data-manual-uuid="false" data-client-authority="false">
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <strong>مركز البيانات V2</strong>
            <span>إعادة بناء مستقلة · تجميد الواجهة السابقة</span>
          </div>
          <nav className={styles.nav} aria-label="أقسام مركز البيانات V2">
            {navItems.map((item) => <button key={item.id} type="button" data-active={view === item.id} onClick={() => setView(item.id)}><b>{item.label}</b><small>{item.description}</small></button>)}
          </nav>
        </aside>

        <section className={styles.content}>
          <header className={styles.hero}>
            <div>
              <span className={styles.badge} data-tone="ready">الإصدار V2 · محكوم من الخادم</span>
              <h1>مركز البيانات التشغيلي الجديد</h1>
              <p>لا إدخال يدوي للمعرّفات، ولا نشر مباشر، ولا انتقال في دورة الحياة خارج الإجراءات التي يسمح بها الخادم.</p>
            </div>
            <div className={styles.heroActions}>
              <button className={styles.secondary} type="button" onClick={() => void load().catch(() => setMessage("تعذر تحديث البيانات."))}>تحديث</button>
              <Link className={styles.secondary} href="/operations/data-center-v2?view=overview">لوحة مركز البيانات V2</Link>
            </div>
          </header>

          <div className={styles.notice} data-tone="success">
            <b>تجميد الواجهة السابقة مفعّل:</b> المسار السابق مخصص للرجوع الطارئ فقط. مركز البيانات V2 مستقل ولا يعتمد على الإدخال اليدوي للمعرّفات.
          </div>
          {message && <div className={styles.notice} role="status">{message}</div>}

          {view === "overview" && <>
            <div className={styles.grid4}>
              <article className={styles.card}><small>دفعات نشطة</small><div className={styles.metric}>{stats.active.toLocaleString("ar-IQ")}</div><span className={styles.muted}>من نفس مصدر الدفعات الخادمي</span></article>
              <article className={styles.card}><small>جاهزة للتحويل</small><div className={styles.metric}>{stats.ready.toLocaleString("ar-IQ")}</div><span className={styles.muted}>تنتظر إجراءً مصرحاً به من الخادم</span></article>
              <article className={styles.card}><small>دفعات مكتملة</small><div className={styles.metric}>{stats.completed.toLocaleString("ar-IQ")}</div><span className={styles.muted}>تم الاستيراد أو الرفض</span></article>
              <article className={styles.card}><small>صفوف مرفوضة</small><div className={styles.metric}>{stats.rejectedRows.toLocaleString("ar-IQ")}</div><span className={styles.muted}>لا تدخل الكتالوج تلقائياً</span></article>
            </div>
            <section className={styles.panel}>
              <div className={styles.panelHead}><div><h2>مرجع البيانات الحي</h2><p className={styles.muted}>مؤشرات فقط؛ لا توجد قوائم UUID للمشغل.</p></div><span className={styles.badge}>للقراءة فقط</span></div>
              <div className={styles.grid4}>
                <article className={styles.card}><small>جهات</small><div className={styles.metric}>{reference.organizations.length.toLocaleString("ar-IQ")}</div></article>
                <article className={styles.card}><small>منتجات</small><div className={styles.metric}>{reference.products.length.toLocaleString("ar-IQ")}</div></article>
                <article className={styles.card}><small>علامات</small><div className={styles.metric}>{reference.brands.length.toLocaleString("ar-IQ")}</div></article>
                <article className={styles.card}><small>تصنيفات</small><div className={styles.metric}>{reference.categories.length.toLocaleString("ar-IQ")}</div></article>
              </div>
            </section>
          </>}

          {view === "intake" && <>
            <div className={styles.grid2}>
              <section className={styles.panel}>
                <div className={styles.panelHead}><div><h2>دفعة CSV جديدة</h2><p className={styles.muted}>تدخل منطقة التجهيز فقط، ثم تتحول إلى مسودات بإجراء منفصل.</p></div><span className={styles.badge}>IQ-BGD</span></div>
                <form className={styles.form} onSubmit={submitCsv}>
                  <label>ملف CSV<span className={styles.filePicker}><span>{csvFileName}</span><span className={styles.fileButton}>اختيار ملف</span><input className={styles.fileInput} name="csvFile" type="file" accept=".csv,text/csv" required onChange={(event) => setCsvFileName(event.target.files?.[0]?.name || "لم يتم اختيار ملف")} /></span></label>
                  <label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} placeholder="مثال: قائمة موثقة — بغداد" required /></label>
                  <label className={styles.check}><input name="sourceConfirmed" type="checkbox" required />راجعت المصدر وأؤكد أن البيانات قابلة للتدقيق</label>
                  <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={working === "csv"}>{working === "csv" ? "جارٍ الفحص…" : "فحص وتجهيز الدفعة"}</button></div>
                </form>
              </section>

              <section className={styles.panel}>
                <div className={styles.panelHead}><div><h2>جهة واحدة</h2><p className={styles.muted}>مسار متوافق مع آلية الإدخال الحالية؛ يبدأ كمسودة ولا ينشر مباشرة.</p></div><span className={styles.badge}>مسودة فقط</span></div>
                <form className={styles.form} onSubmit={submitManualOrganization}>
                  <label>نوع الجهة<select name="roleType" defaultValue="cafe"><option value="cafe">مقهى</option><option value="roaster">محمصة</option><option value="seller">بائع أو متجر</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مزود خدمة</option></select></label>
                  <label>اسم الجهة<input name="name" minLength={2} maxLength={160} required /></label>
                  <label>العنوان في بغداد<input name="address" minLength={3} maxLength={400} required /></label>
                  <label>التواصل<input name="contact" maxLength={300} /></label>
                  <label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} required /></label>
                  <label className={styles.check}><input name="sourceConfirmed" type="checkbox" required />راجعت الاسم والعنوان والمصدر</label>
                  <div className={styles.formActions}><button className={styles.primary} type="submit" disabled={working === "manual"}>{working === "manual" ? "جارٍ الإنشاء…" : "إنشاء مسودة موثقة"}</button></div>
                </form>
              </section>
            </div>
            {preview.length > 0 && <section className={styles.panel}><div className={styles.panelHead}><h2>معاينة التحقق</h2><span className={styles.badge}>{preview.length.toLocaleString("ar-IQ")} صف</span></div><ul className={styles.previewList}>{preview.slice(0, 100).map((row) => <li className={styles.previewItem} data-status={row.status} key={`${row.sourceRowNumber}-${row.normalized.name_ar}`}><b>{row.normalized.name_ar || "بدون اسم"}</b><div className={styles.meta}>{row.normalized.address_ar}</div>{row.messages.length > 0 && <small>{row.messages.join(" · ")}</small>}</li>)}</ul></section>}
          </>}

          {view === "catalog" && <CatalogIntakeV2 reference={reference} onCreated={async () => { await load(); await runMirror(); }} />}

          {view === "batches" && <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>دفعات الاستيراد</h2><p className={styles.muted}>الأزرار أدناه تظهر فقط الإجراءات التي يسمح بها عقد دورة الحياة الخادمي.</p></div><span className={styles.badge}>{activeBatches.length.toLocaleString("ar-IQ")}</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>رمز الدفعة</th><th>المصدر</th><th>الحالة</th><th>الصفوف</th><th>الأفعال</th></tr></thead>
                <tbody>{activeBatches.map((batch) => <tr key={batch.id} data-lifecycle-revision={batch.lifecycle?.contractRevision || "unavailable"}><td className={styles.code}>{batch.batch_code}</td><td>{batch.source_label}</td><td><span className={styles.badge} data-tone={batch.status === "ready" ? "ready" : batch.status === "rejected" ? "danger" : "warning"}>{batchStatusLabel(batch.status)}</span></td><td>{batch.total_rows.toLocaleString("ar-IQ")} · صالح {batch.valid_rows.toLocaleString("ar-IQ")} · مرفوض {batch.rejected_rows.toLocaleString("ar-IQ")}</td><td><div className={styles.actions}><button className={styles.secondary} type="button" disabled={working === `details:${batch.id}`} onClick={() => void openBatch(batch)}>تفاصيل</button>{(batch.lifecycle?.availableActions || []).map((action) => <button key={action.action} className={action.action === "delete" ? styles.danger : styles.primary} type="button" disabled={!action.enabled || working === `action:${batch.id}`} title={action.blockedReason || undefined} onClick={() => setConfirmRequest({ batch, action })}>{action.label}</button>)}</div></td></tr>)}</tbody>
              </table>
            </div>
            {details && <div className={styles.card}><div className={styles.batchHead}><div><h3>تفاصيل {details.batch.batch_code}</h3><p className={styles.muted}>{details.batch.source_label}</p></div><button className={styles.secondary} type="button" onClick={() => setDetails(null)}>إغلاق</button></div><ul className={styles.detailList}>{details.rows.slice(0, 200).map((row) => <li className={styles.detailItem} key={row.id}><b>صف {row.source_row_number.toLocaleString("ar-IQ")}</b><span className={styles.badge}>{validationStatusLabel(row.validation_status)}</span><div className={styles.meta}>{String(row.normalized_payload.name_ar || "")} · {String(row.normalized_payload.address_ar || "")}</div>{row.validation_messages?.length > 0 && <small>{row.validation_messages.join(" · ")}</small>}</li>)}</ul></div>}
          </section>}

          {view === "handoffs" && <section className={styles.panel}>
            <div className={styles.panelHead}><div><h2>مسارات الحوكمة المتخصصة</h2><p className={styles.muted}>V2 لا يكرر منطق Review أو Media أو Search أو Support؛ يعيد العمل إلى المالك التشغيلي الصحيح.</p></div><span className={styles.badge}>بلا صلاحيات مكررة</span></div>
            <div className={styles.handoffGrid}>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=review"><b>المراجعة والاعتماد</b><p className={styles.muted}>مراجعة المسودات واتخاذ قرارات النشر عبر العقود الحالية.</p></Link>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=media"><b>خزنة الوسائط</b><p className={styles.muted}>الصور والملفات والحقوق والحجر والحفظ.</p></Link>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=search"><b>حوكمة البحث</b><p className={styles.muted}>المصطلحات والمرادفات ومعالجة عبارات البحث الضعيفة.</p></Link>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=requests"><b>مكتب الدعم</b><p className={styles.muted}>الطلبات والمهام التقنية والتعيين الخاضع للصلاحيات.</p></Link>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=archive"><b>الأرشيف</b><p className={styles.muted}>السجلات غير النشطة ودفعات الاستيراد المؤرشفة.</p></Link>
              <Link className={styles.handoff} href="/operations/data-center-v2/specialist?workspace=taxonomy"><b>التصنيفات المحكومة</b><p className={styles.muted}>الفئات والحقول والتصفية المحكومة.</p></Link>
            </div>
          </section>}

          {view === "client" && <section className={styles.panel} data-client-facing-parity="read-only">
            <div className={styles.panelHead}><div><h2>مرآة المنصة الرئيسية للزبون</h2><p className={styles.muted}>فحص مراقبة للقراءة فقط يعمل عند فتح V2، وكل 60 ثانية، وعند العودة للنافذة. لا يسمح V2 بتجاوز بوابة النشر.</p></div><button className={styles.primary} type="button" onClick={() => void runMirror()}>فحص الآن</button></div>
            {mirror.map((probe) => <div className={styles.mirrorRow} key={probe.key}><div><b>{probe.label}</b><div className={`${styles.meta} ${styles.code}`}>{probe.endpoint}</div></div><span className={styles.badge} data-tone={probe.state === "ok" ? "ready" : probe.state === "error" ? "danger" : "warning"}>{probe.state === "idle" ? "لم يُفحص" : probe.state === "loading" ? "جارٍ الفحص" : probe.state === "ok" ? "متاح" : "خطأ"}</span><strong>{probe.count === null ? "—" : probe.count.toLocaleString("ar-IQ")}</strong></div>)}
            <div className={styles.notice}><b>قاعدة الموازنة:</b> أي إدخال من V2 يبقى Draft حتى يمر عبر Review. هذه المرآة تقيس فقط ما يستطيع العميل العام رؤيته حالياً.</div>
          </section>}
        </section>
      </div>

      <StandardConfirmDialog
        open={Boolean(confirmRequest)}
        title={confirmRequest?.action.action === "delete" ? "تأكيد المسح النهائي للدفعة" : confirmRequest?.action.label || "تأكيد الإجراء"}
        description={confirmRequest ? `${confirmRequest.action.validationRequirements.join(" · ")} — ${confirmRequest.batch.batch_code}` : ""}
        confirmLabel={confirmRequest?.action.label || "تأكيد"}
        tone={confirmRequest?.action.action === "delete" ? "danger" : "default"}
        busy={confirmBusy}
        input={confirmRequest?.action.confirmationMode === "typed" ? { label: "اكتب رمز الدفعة للتأكيد", requiredValue: confirmRequest.batch.batch_code } : undefined}
        onCancel={() => setConfirmRequest(null)}
        onConfirm={() => confirmRequest ? executeLifecycle(confirmRequest.batch, confirmRequest.action) : undefined}
      />
    </div>
  );
}
