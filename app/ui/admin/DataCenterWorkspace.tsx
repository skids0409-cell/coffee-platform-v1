"use client";

import { useEffect, useState, type ReactNode } from "react";

export type DataCenterBatch = {
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
};

export type DataCenterPreviewRow = {
  sourceRowNumber: number;
  normalized: { name_ar: string; address_ar: string; contact: string | null; role_type?: string };
  status: "valid" | "warning" | "invalid";
  messages: string[];
};

export type DataCenterReference = {
  categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null; navigation_parent_id: string | null; is_navigation_visible: boolean; catalog_family_id: string | null; catalog_filter_id: string | null; catalog_product_kind: string | null; comparison_group: string | null }>;
  organizations: Array<{ id: string; name_ar: string; status: string; organization_roles: Array<{ role_type: string }> }>;
  products: Array<{ id: string; name_ar: string; product_kind: string; status: string; brand_id: string | null; owner_organization_id: string | null; brands: { name_ar: string } | null; organizations: { name_ar: string } | null; product_categories: Array<{ category_id: string; categories: { code: string; name_ar: string } | null }>; product_attribute_values: Array<{ value_text: string | null; value_json: unknown; field_definitions: { code: string } | null }> }>;
  brands: Array<{ id: string; name_ar: string; product_kinds: string[] }>;
  countries: Array<{ code: string; name_ar: string; coffee_regions: Array<{ id: string; name_ar: string }> }>;
  filterDefinitions: Array<{ category_id: string; id: string; code: string; name_ar: string; data_type: string; allowed_values: string[]; unit_code: string | null; is_required_for_publish: boolean; sort_order: number }>;
};

type BatchDetails = {
  batch: DataCenterBatch;
  rows: Array<{ id: string; source_row_number: number; normalized_payload: Record<string, unknown>; validation_status: string; validation_messages: string[]; target_table: string | null; target_id: string | null }>;
};

type DataCenterWorkspaceProps = {
  onChanged: () => Promise<void>;
  mode?: "entry" | "imports";
  renderEntry?: (reference: DataCenterReference, reload: () => Promise<void>) => ReactNode;
};

const emptyReference = (): DataCenterReference => ({ categories: [], organizations: [], products: [], brands: [], countries: [], filterDefinitions: [] });

export function DataCenterWorkspace({ onChanged, mode = "entry", renderEntry }: DataCenterWorkspaceProps) {
  const [batches, setBatches] = useState<DataCenterBatch[]>([]);
  const [preview, setPreview] = useState<DataCenterPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [reference, setReference] = useState<DataCenterReference>(emptyReference());

  const load = async () => {
    const response = await fetch("/api/admin/data-center", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("load_failed");
    const data = await response.json();
    setBatches(data.batches || []);
    setReference(data.referenceData || emptyReference());
  };

  useEffect(() => {
    const handle = window.setTimeout(() => void load().catch(() => setMessage("تعذر تحميل سجل دفعات البيانات.")), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const responseMessage = (reason?: string) => {
    if (reason === "missing_headers") return "يجب أن يحتوي الملف على عمودي «اسم الجهة» (أو اسم الكافيه للتوافق) و«عنوان».";
    if (reason === "too_many_rows") return "الحد الأعلى للدفعة الواحدة 500 سجل.";
    if (reason === "source_confirmation_required") return "اكتب اسم المصدر وأكد أنك راجعت البيانات.";
    if (reason === "market_not_enabled") return "سوق هذه المحافظة غير مفعّل في نسخة الاختبار الحالية.";
    if (reason === "no_valid_rows") return "لم نجد سجلاً صالحاً للاستيراد؛ راجع الأخطاء في المعاينة.";
    return "تعذر تنفيذ العملية. لم تُنشر أي بيانات.";
  };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking("manual");
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create_manual_draft", name: form.get("name"), address: form.get("address"), contact: form.get("contact"), roleType: form.get("roleType"), marketCode: form.get("marketCode"), sourceLabel: form.get("sourceLabel"), sourceConfirmed: form.get("sourceConfirmed") === "on" }),
    });
    const data = await response.json();
    setWorking("");
    setPreview(data.preview || []);
    if (!response.ok) { setMessage(responseMessage(data.reason)); return; }
    setBatches(data.batches || []);
    formElement.reset();
    setMessage("تم إنشاء الجهة وموقعها ودورها كمسودة موثقة. أرسلها للمراجعة من الطابور أدناه.");
    await onChanged();
  };

  const submitCsv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("csvFile");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) { setMessage("اختر ملف CSV صالحاً."); return; }
    setWorking("csv");
    setMessage("جارٍ فحص الملف ومنع التكرار…");
    const csvText = await file.text();
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "stage_csv", csvText, marketCode: form.get("marketCode"), sourceLabel: form.get("sourceLabel"), sourceConfirmed: form.get("sourceConfirmed") === "on" }),
    });
    const data = await response.json();
    setWorking("");
    setPreview(data.preview || []);
    if (!response.ok) { setMessage(responseMessage(data.reason)); return; }
    setBatches(data.batches || []);
    setMessage("اكتمل التحقق. راجع المعاينة ثم اضغط «تحويل إلى مسودات» على الدفعة.");
  };

  const importBatch = async (batchId: string) => {
    if (!window.confirm("سيتم إنشاء السجلات الصالحة كمسودات فقط، ولن يظهر شيء للعامة. هل تريد المتابعة؟")) return;
    setWorking(batchId);
    setMessage("");
    const response = await fetch("/api/admin/data-center", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "import_batch", batchId }) });
    const data = await response.json();
    setWorking("");
    if (!response.ok) { setMessage(responseMessage(data.reason)); return; }
    setBatches(data.batches || []);
    setMessage(`تم إنشاء ${Number(data.imported?.imported || 0).toLocaleString("ar-IQ")} مسودة. راجعها في طابور الجهات.`);
    await onChanged();
  };

  const openBatch = async (batchId: string) => {
    setWorking(`details-${batchId}`);
    const response = await fetch(`/api/admin/data-center?batchId=${encodeURIComponent(batchId)}`, { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    setWorking("");
    if (!response.ok) { setMessage("تعذر فتح تفاصيل الدفعة."); return; }
    setBatchDetails(data);
  };

  const changeBatchArchive = async (batch: DataCenterBatch) => {
    if (!window.confirm("ستنقل الدفعة المكتملة إلى قسم الأرشيف الرئيسي ويمكن استعادتها لاحقاً. هل تريد المتابعة؟")) return;
    setWorking(`archive-${batch.id}`);
    const response = await fetch("/api/admin/data-center", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive_batch", batchId: batch.id }) });
    const data = await response.json();
    setWorking("");
    if (!response.ok) { setMessage("لا يمكن أرشفة دفعة غير مكتملة. عالجها أو ارفضها أولاً."); return; }
    setBatches(data.batches || []);
    setBatchDetails(null);
    setMessage("نُقلت الدفعة إلى قسم الأرشيف الرئيسي.");
  };

  const visibleBatches = batches.filter((batch) => batch.status !== "archived");
  const batchStatusLabel = (value: string) => ({ ready: "جاهزة للتحويل", imported: "تم الاستيراد", rejected: "مرفوضة", archived: "مؤرشفة", draft: "مسودة", validating: "قيد الفحص" }[value] || value);

  return <section className={`data-center data-center-${mode}`} id={mode === "entry" ? "operations-data-entry" : "operations-imports"} data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">Operations Center V3</span><h2>{mode === "entry" ? "إضافة سجل جديد" : "الاستيراد الجماعي وسجل الدفعات"}</h2></div><span className="draft-safety">كل إدخال يبدأ كمسودة</span></div>
    <p>{mode === "entry" ? "مدخل موحّد للجهات والعلامات والقهوة والمعدات والعروض والمصادر والمحتوى. اختر القسم والفئة أولاً، ثم راجع المعاينة قبل إنشاء المسودة." : "ارفع CSV، افحص الصفوف، ثم حوّل السجلات السليمة إلى مسودات. لا تنشر عملية الاستيراد أي سجل تلقائياً."}</p>
    <div className="market-scope-note"><b>النطاق الجغرافي للدليل في الاختبار الحالي: محافظة بغداد</b><span>هذا القيد يخص عناوين الجهات والفروع فقط، ولا يمنع إدخال المنتجات أو العلامات أو المحتوى المعرفي.</span></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    {mode === "entry" && (renderEntry ? renderEntry(reference, async () => { await load(); await onChanged(); }) : <p className="admin-message">نموذج الإدخال قيد النقل إلى مساحة العمل المستقلة.</p>)}
    {mode === "imports" && <div className="bulk-intake">
      <div className="subsection-head"><h3>دفعات الجهات المشاركة في المنصة</h3><span>مقاهٍ، محامص، بائعون، موردون، ومراكز خدمة أو تدريب</span></div>
      <div className="data-entry-grid">
        <form onSubmit={submitManual}><h3>إدخال سجل واحد</h3><label>المحافظة<select name="marketCode" defaultValue="IQ-BGD"><option value="IQ-BGD">بغداد — سوق الاختبار الحالي</option></select></label><label>نوع الجهة<select name="roleType" defaultValue="cafe"><option value="cafe">مقهى</option><option value="roaster">محمصة</option><option value="seller">بائع أو متجر</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مركز تعليم/تدريب أو مزود خدمة</option></select></label><label>اسم الجهة<input name="name" minLength={2} maxLength={160} required /></label><label>العنوان في بغداد<input name="address" minLength={3} maxLength={400} required /></label><label>التواصل (اختياري)<input name="contact" maxLength={300} placeholder="@instagram أو رقم أو رابط" /></label><label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} placeholder="مثال: قائمة مقاهي بغداد — إنستغرام" required /></label><label className="check"><input name="sourceConfirmed" type="checkbox" required /> راجعت الاسم والعنوان وأعتبرهما صحيحين</label><button type="submit" disabled={working === "manual"}>{working === "manual" ? "جارٍ الحفظ…" : "حفظ كمسودة"}</button></form>
        <form onSubmit={submitCsv}><h3>استيراد ملف CSV</h3><p>الأعمدة المقبولة: <b>اسم الجهة، نوع الجهة، عنوان، تواصل</b>. نوع الجهة اختياري ويُعامل كمقهى عند غيابه للتوافق مع الملفات القديمة.</p><label>المحافظة لكل الملف<select name="marketCode" defaultValue="IQ-BGD"><option value="IQ-BGD">بغداد — سوق الاختبار الحالي</option></select></label><label>الملف<input name="csvFile" type="file" accept=".csv,text/csv" required /></label><label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} placeholder="اسم الحساب أو القائمة وتاريخها" required /></label><label className="check"><input name="sourceConfirmed" type="checkbox" required /> راجعت البيانات وأسمح بتحويل الصالح منها إلى مسودات</label><button type="submit" disabled={working === "csv"}>{working === "csv" ? "جارٍ التحقق…" : "فحص الملف أولاً"}</button></form>
      </div>
      {preview.length > 0 && <div className="data-preview" data-governed-inspector="true"><h3>معاينة التحقق <span>{preview.length}</span></h3><div className="data-table" role="table" aria-label="نتيجة فحص ملف البيانات"><div className="head" role="row"><span>الصف</span><span>الجهة ونوعها</span><span>العنوان</span><span>النتيجة</span></div>{preview.slice(0, 50).map((row) => <div role="row" key={`${row.sourceRowNumber}-${row.normalized.name_ar}`}><span>{row.sourceRowNumber}</span><b>{row.normalized.name_ar || "—"} · {row.normalized.role_type || "cafe"}</b><span>{row.normalized.address_ar || "—"}</span><span className={`intake-status ${row.status}`}>{row.status === "valid" ? "صالح" : row.status === "warning" ? "تنبيه" : "مرفوض"}{row.messages.length ? ` — ${row.messages.join("، ")}` : ""}</span></div>)}</div>{preview.length > 50 && <small>تظهر أول 50 نتيجة فقط؛ تم فحص جميع الصفوف.</small>}</div>}
      <div className="batch-list" data-governed-master="true"><div className="subsection-head"><div><h3>سجل الدفعات النشطة</h3><span>الدفعة المؤرشفة تنتقل إلى قسم «الأرشيف» الرئيسي ولا تبقى هنا.</span></div></div>{visibleBatches.length ? visibleBatches.map((batch) => <article key={batch.id}><div><b>{batch.source_label}</b><span>{batch.entity_type === "organization" ? "جهات مشاركة" : batch.entity_type} · {new Date(batch.created_at).toLocaleDateString("ar-IQ")} · المرجع {batch.batch_code}</span><span>{batch.total_rows} سجل · {batch.valid_rows} صالح · {batch.rejected_rows} مرفوض</span></div><div className="queue-actions"><span className={`batch-status ${batch.status}`}>{batchStatusLabel(batch.status)}</span><button type="button" disabled={working === `details-${batch.id}`} onClick={() => openBatch(batch.id)}>عرض التفاصيل</button>{batch.status === "ready" && <button type="button" disabled={working === batch.id} onClick={() => importBatch(batch.id)}>{working === batch.id ? "جارٍ التحويل…" : "تحويل إلى مسودات"}</button>}{["imported", "rejected"].includes(batch.status) && <button type="button" disabled={working === `archive-${batch.id}`} onClick={() => changeBatchArchive(batch)}>حفظ في الأرشيف</button>}</div></article>) : <p>لا توجد دفعات بعد.</p>}</div>
    </div>}
    {batchDetails && <div className="batch-details" role="dialog" aria-modal="true"><section><div className="section-head"><div><span className="eyebrow">تفاصيل الدفعة</span><h3>{batchDetails.batch.source_label}</h3></div><button type="button" onClick={() => setBatchDetails(null)}>إغلاق</button></div><p>{batchDetails.batch.batch_code} · {batchStatusLabel(batchDetails.batch.status)}</p><div className="data-table" role="table"><div className="head" role="row"><span>الصف</span><span>الاسم</span><span>العنوان</span><span>النتيجة</span></div>{batchDetails.rows.map((row) => <div role="row" key={row.id}><span>{row.source_row_number}</span><b>{String(row.normalized_payload?.name_ar || "—")}</b><span>{String(row.normalized_payload?.address_ar || "—")}</span><span>{row.validation_status}{row.validation_messages?.length ? ` — ${row.validation_messages.join("، ")}` : ""}</span></div>)}</div></section></div>}
  </section>;
}
