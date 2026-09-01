"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Status = "draft" | "in_review" | "published" | "archived" | "rejected";
type Category = {
  id: string; code: string; parent_id: string | null; slug: string; name_ar: string; name_en: string;
  description_ar: string | null; description_en: string | null; sort_order: number; comparison_group: string | null;
  navigation_parent_id: string | null; is_navigation_visible: boolean; catalog_family_id: string | null;
  catalog_filter_id: string | null; catalog_product_kind: string | null;
  phase: string; is_filterable: boolean; status: Status; updated_at: string;
};
type Field = {
  id: string; code: string; name_ar: string; name_en: string; data_type: string; unit_code: string | null;
  allowed_values: string[]; validation_rules: Record<string, unknown>; missing_value_policy: string;
  is_searchable: boolean; is_comparable: boolean; is_recommendation_input: boolean; is_multi_value: boolean;
  status: Status; updated_at: string;
};
type Filter = {
  id: string; category_id: string; field_definition_id: string; operator: string; sort_order: number;
  is_visible: boolean; is_required_for_publish: boolean; status: Status; updated_at: string;
};
type Snapshot = { schemaVersion: string; serverTime: string; categories: Category[]; fields: Field[]; filters: Filter[] };
type FilterDraft = Pick<Filter, "field_definition_id" | "operator" | "sort_order" | "is_visible" | "is_required_for_publish">;

const emptyCategory = { code: "", parent_id: "", slug: "", name_ar: "", name_en: "", description_ar: "", description_en: "", sort_order: 0, comparison_group: "", phase: "V1", is_filterable: true };
const emptyField = { code: "", name_ar: "", name_en: "", data_type: "text", unit_code: "", allowed_values: "", missing_value_policy: "hide", is_searchable: false, is_comparable: false, is_recommendation_input: false, is_multi_value: false };
const statusLabels: Record<Status, string> = { draft: "مسودة", in_review: "قيد المراجعة", published: "منشور", archived: "مؤرشف", rejected: "مرفوض" };
const nextStatuses: Record<Status, Status[]> = { draft: ["in_review"], in_review: ["published", "rejected", "draft"], published: ["archived"], archived: ["draft"], rejected: ["draft"] };

async function request(method: string, body?: Record<string, unknown>) {
  const response = await fetch("/api/admin/taxonomy", { method, cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.reason || "request_failed");
  return data as Snapshot & { result?: unknown };
}

export function TaxonomyWorkspace() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [showSystemCategories, setShowSystemCategories] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [categoryForm, setCategoryForm] = useState({ ...emptyCategory });
  const [fieldForm, setFieldForm] = useState({ ...emptyField });
  const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);

  const load = useCallback(async () => {
    setBusy("load");
    try { setData(await request("GET")); setMessage(""); }
    catch { setMessage("تعذر تحميل مخطط التصنيفات. لم يتغير أي سجل."); }
    finally { setBusy(""); }
  }, []);
  useEffect(() => {
    const handle = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const selectedCategory = data?.categories.find((row) => row.id === categoryId) || null;
  const selectedField = data?.fields.find((row) => row.id === fieldId) || null;
  const visibleCategories = useMemo(() => (data?.categories || []).filter((row) => (showSystemCategories || row.is_navigation_visible) && (!query.trim() || `${row.code} ${row.name_ar} ${row.name_en}`.toLocaleLowerCase("ar-IQ").includes(query.trim().toLocaleLowerCase("ar-IQ")))), [data, query, showSystemCategories]);

  const selectCategory = (row: Category) => {
    setCategoryId(row.id);
    setCategoryForm({ code: row.code, parent_id: row.parent_id || "", slug: row.slug, name_ar: row.name_ar, name_en: row.name_en, description_ar: row.description_ar || "", description_en: row.description_en || "", sort_order: row.sort_order, comparison_group: row.comparison_group || "", phase: row.phase, is_filterable: row.is_filterable });
    setFilterDrafts((data?.filters || []).filter((item) => item.category_id === row.id).map(({ field_definition_id, operator, sort_order, is_visible, is_required_for_publish }) => ({ field_definition_id, operator, sort_order, is_visible, is_required_for_publish })));
    setMessage("");
  };
  const selectField = (row: Field) => {
    setFieldId(row.id);
    setFieldForm({ code: row.code, name_ar: row.name_ar, name_en: row.name_en, data_type: row.data_type, unit_code: row.unit_code || "", allowed_values: row.allowed_values.join("\n"), missing_value_policy: row.missing_value_policy, is_searchable: row.is_searchable, is_comparable: row.is_comparable, is_recommendation_input: row.is_recommendation_input, is_multi_value: row.is_multi_value });
    setMessage("");
  };
  const adoptSnapshot = (snapshot: Snapshot) => {
    setData(snapshot);
    const category = snapshot.categories.find((row) => row.id === categoryId);
    if (category) {
      setCategoryForm({ code: category.code, parent_id: category.parent_id || "", slug: category.slug, name_ar: category.name_ar, name_en: category.name_en, description_ar: category.description_ar || "", description_en: category.description_en || "", sort_order: category.sort_order, comparison_group: category.comparison_group || "", phase: category.phase, is_filterable: category.is_filterable });
      setFilterDrafts(snapshot.filters.filter((item) => item.category_id === category.id).map(({ field_definition_id, operator, sort_order, is_visible, is_required_for_publish }) => ({ field_definition_id, operator, sort_order, is_visible, is_required_for_publish })));
    }
  };
  const run = async (key: string, method: string, body: Record<string, unknown>, success: string) => {
    setBusy(key); setMessage("");
    try { const result = await request(method, body); adoptSnapshot(result); setMessage(success); }
    catch (error) { const reason = error instanceof Error ? error.message : "request_failed"; setMessage(reason === "taxonomy_version_conflict" ? "رفض الحفظ: تغير السجل في جلسة أخرى. أعد التحميل وراجع التعديل." : `رفضت قاعدة البيانات العملية: ${reason}`); }
    finally { setBusy(""); }
  };
  const categoryPayload = { ...categoryForm, parent_id: categoryForm.parent_id || null };
  const fieldRequestPayload = { ...fieldForm, unit_code: fieldForm.unit_code || null, allowed_values: fieldForm.allowed_values.split(/[,،\n]/).map((value) => value.trim()).filter(Boolean), validation_rules: {} };
  const saveField = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const allowedValues = fieldRequestPayload.allowed_values;
    if (!/^[a-z][a-z0-9_]*$/.test(fieldRequestPayload.code.trim())
        || fieldRequestPayload.name_ar.trim().length < 2
        || fieldRequestPayload.name_en.trim().length < 2
        || new Set(allowedValues).size !== allowedValues.length) {
      setMessage("تحقق من رمز الحقل والأسماء، وتأكد من عدم تكرار القيم المسموحة.");
      return;
    }
    setBusy("field");
    setMessage("");
    try {
      const result = await request(selectedField ? "PATCH" : "POST", selectedField
        ? { action: "update_field", id: selectedField.id, payload: fieldRequestPayload, expectedUpdatedAt: selectedField.updated_at }
        : { action: "create_field", payload: fieldRequestPayload });
      setData(result);
      const saved = result.result && typeof result.result === "object" ? result.result as Field : null;
      if (saved?.id) selectField(saved);
      setMessage(selectedField ? "حُفظ تعريف الحقل وسُجل التغيير." : "أُنشئ الحقل كمسودة وأضيف إلى قاموس الحقول.");
    } catch (error) {
      const reason = error instanceof Error ? error.message : "request_failed";
      setMessage(reason === "taxonomy_version_conflict" ? "رفض الحفظ: تغير الحقل في جلسة أخرى. أعد التحميل وراجع التعديل." : `رفضت قاعدة البيانات العملية: ${reason}`);
    } finally {
      setBusy("");
    }
  };
  const transition = (entity: "category" | "field", row: Category | Field, status: Status) => {
    const reason = window.prompt(`سبب نقل الحالة إلى «${statusLabels[status]}» (10 أحرف على الأقل):`) || "";
    if (reason.trim().length < 10) { setMessage("أُلغي القرار: السبب يجب ألا يقل عن 10 أحرف."); return; }
    if (status === "published" && !window.confirm("سيصبح تعريف التصنيف فعالاً في واجهات الاكتشاف. هل راجعت الحقول والفلاتر؟")) return;
    void run(`transition-${row.id}`, "PATCH", { action: "transition_status", entity, id: row.id, status, reason, expectedUpdatedAt: row.updated_at }, "تم تغيير الحالة وتسجيل القرار في سجل التدقيق.");
  };

  return <section className="taxonomy-workspace" id="operations-taxonomy">
    <div className="section-head"><div><span className="eyebrow">STEP2 · Governed taxonomy</span><h2>إدارة التصنيفات والحقول والفلاتر</h2></div><button type="button" onClick={load} disabled={!!busy}>إعادة التحميل</button></div>
    <p>كل تعديل يمر عبر دوال قاعدة البيانات، قفل تنافسي، تحقق دورة الحياة، وسجل تدقيق. الحذف المباشر غير متاح.</p>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="taxonomy-summary"><b>{data?.categories.length || 0}<small>تصنيف</small></b><b>{data?.fields.length || 0}<small>حقل</small></b><b>{data?.filters.length || 0}<small>ربط فلتر</small></b><span>{data?.schemaVersion || "جارٍ التحميل"}</span></div>

    <div className="taxonomy-layout">
      <aside className="taxonomy-list"><label>بحث التصنيفات<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="الرمز أو الاسم" /></label><label className="taxonomy-check"><input type="checkbox" checked={showSystemCategories} onChange={(event)=>setShowSystemCategories(event.target.checked)} /> عرض التصنيفات التقنية المخفية</label><button type="button" className={!categoryId ? "active" : ""} onClick={() => { setCategoryId(""); setCategoryForm({ ...emptyCategory }); setFilterDrafts([]); }}>+ تصنيف جديد</button>{visibleCategories.map((row) => <button type="button" key={row.id} className={categoryId === row.id ? "active" : ""} onClick={() => selectCategory(row)}><b>{row.name_ar}</b><span>{row.code} · {row.catalog_filter_id === row.id ? "فلتر مستوى ثانٍ" : row.catalog_family_id === row.id ? "عائلة رئيسية" : row.navigation_parent_id ? "فرع تنقّل" : "قسم منصة"} · {statusLabels[row.status]}</span></button>)}</aside>
      <div className="taxonomy-editor">
        <div className="section-head"><div><span className="eyebrow">Category</span><h3>{selectedCategory ? `تعديل ${selectedCategory.code}` : "إنشاء تصنيف"}</h3></div>{selectedCategory && <span className={`taxonomy-status ${selectedCategory.status}`}>{statusLabels[selectedCategory.status]}</span>}</div>
        {selectedCategory?.code === "COF-GREEN" && <p className="taxonomy-warning">البن الأخضر مؤجل إلى Phase 2 ولا يمكن نشره في V1.</p>}
        <div className="taxonomy-form-grid"><label>الرمز<input value={categoryForm.code} disabled={!!selectedCategory} onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })} /></label><label>Slug<input dir="ltr" value={categoryForm.slug} disabled={!!selectedCategory} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} /></label><label>الاسم العربي<input value={categoryForm.name_ar} onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })} /></label><label>الاسم الإنكليزي<input dir="ltr" value={categoryForm.name_en} onChange={(e) => setCategoryForm({ ...categoryForm, name_en: e.target.value })} /></label><label>التصنيف الأب<select value={categoryForm.parent_id} onChange={(e) => setCategoryForm({ ...categoryForm, parent_id: e.target.value })}><option value="">بدون أب</option>{(data?.categories || []).filter((row) => row.id !== categoryId).map((row) => <option value={row.id} key={row.id}>{row.code} — {row.name_ar}</option>)}</select></label><label>المرحلة<select value={categoryForm.phase} onChange={(e) => setCategoryForm({ ...categoryForm, phase: e.target.value })}><option>V1</option><option>Phase 2 Professional</option></select></label><label>ترتيب العرض<input type="number" min="0" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })} /></label><label>مجموعة المقارنة<input value={categoryForm.comparison_group} onChange={(e) => setCategoryForm({ ...categoryForm, comparison_group: e.target.value })} /></label><label className="taxonomy-check"><input type="checkbox" checked={categoryForm.is_filterable} onChange={(e) => setCategoryForm({ ...categoryForm, is_filterable: e.target.checked })} /> قابل للتصفية</label></div>
        <div className="queue-actions"><button className="primary" type="button" disabled={!!busy} onClick={() => void run("category", selectedCategory ? "PATCH" : "POST", selectedCategory ? { action: "update_category", id: selectedCategory.id, payload: categoryPayload, expectedUpdatedAt: selectedCategory.updated_at } : { action: "create_category", payload: categoryPayload }, "حُفظ التصنيف وسُجل التغيير.")}>{selectedCategory ? "حفظ التعديل" : "إنشاء كمسودة"}</button>{selectedCategory && nextStatuses[selectedCategory.status].map((status) => <button type="button" key={status} disabled={!!busy} onClick={() => transition("category", selectedCategory, status)}>نقل إلى {statusLabels[status]}</button>)}</div>

        {selectedCategory && <section className="taxonomy-filters"><div className="section-head"><div><span className="eyebrow">Facets</span><h3>فلاتر {selectedCategory.code}</h3></div><button type="button" onClick={() => setFilterDrafts([...filterDrafts, { field_definition_id: "", operator: "equals", sort_order: filterDrafts.length, is_visible: true, is_required_for_publish: false }])}>إضافة فلتر</button></div>{filterDrafts.map((row, index) => <div className="taxonomy-filter-row" key={`${row.field_definition_id}-${index}`}><select aria-label="الحقل" value={row.field_definition_id} onChange={(e) => setFilterDrafts(filterDrafts.map((item, i) => i === index ? { ...item, field_definition_id: e.target.value } : item))}><option value="">اختر الحقل</option>{(data?.fields || []).map((field) => <option value={field.id} key={field.id}>{field.code} — {field.name_ar}</option>)}</select><select aria-label="المعامل" value={row.operator} onChange={(e) => setFilterDrafts(filterDrafts.map((item, i) => i === index ? { ...item, operator: e.target.value } : item))}>{["equals", "in", "range", "contains", "exists"].map((operator) => <option key={operator}>{operator}</option>)}</select><input aria-label="الترتيب" type="number" min="0" value={row.sort_order} onChange={(e) => setFilterDrafts(filterDrafts.map((item, i) => i === index ? { ...item, sort_order: Number(e.target.value) } : item))} /><label><input type="checkbox" checked={row.is_visible} onChange={(e) => setFilterDrafts(filterDrafts.map((item, i) => i === index ? { ...item, is_visible: e.target.checked } : item))} />ظاهر</label><label><input type="checkbox" checked={row.is_required_for_publish} onChange={(e) => setFilterDrafts(filterDrafts.map((item, i) => i === index ? { ...item, is_required_for_publish: e.target.checked, is_visible: e.target.checked ? true : item.is_visible } : item))} />إلزامي</label><button type="button" onClick={() => setFilterDrafts(filterDrafts.filter((_, i) => i !== index))}>إزالة</button></div>)}<div className="queue-actions"><button type="button" disabled={!!busy} onClick={() => void run("validate", "POST", { action: "validate_change", categoryId, filters: filterDrafts }, "نجح التحقق دون حفظ.")}>تحقق فقط</button><button className="primary" type="button" disabled={!!busy} onClick={() => void run("filters", "POST", { action: "replace_filters", categoryId, filters: filterDrafts, expectedUpdatedAt: selectedCategory.updated_at }, "استُبدلت روابط الفلاتر ذرياً وسُجل التغيير.")}>حفظ مجموعة الفلاتر</button></div></section>}
      </div>
    </div>

    <section className="taxonomy-fields">
      <form onSubmit={saveField}>
        <div className="section-head">
          <div><span className="eyebrow">Field registry</span><h3>{selectedField ? `تعديل الحقل ${selectedField.code}` : "إنشاء حقل جديد"}</h3></div>
          <div className="taxonomy-head-actions">
            <button type="button" onClick={() => { setFieldId(""); setFieldForm({ ...emptyField }); setMessage(""); }}>+ حقل جديد</button>
            <button className="primary" type="submit" disabled={!!busy}>{busy === "field" ? "جارٍ الحفظ…" : selectedField ? "حفظ الحقل" : "حفظ الحقل الجديد"}</button>
          </div>
        </div>
        <div className="taxonomy-field-layout">
          <div className="taxonomy-list">{(data?.fields || []).map((row) => <button type="button" key={row.id} className={fieldId === row.id ? "active" : ""} onClick={() => selectField(row)}><b>{row.name_ar}</b><span>{row.code} · {row.data_type} · {statusLabels[row.status]}</span></button>)}</div>
          <div>
            <div className="taxonomy-form-grid"><label>رمز الحقل<input dir="ltr" disabled={!!selectedField} required pattern="[a-z][a-z0-9_]*" value={fieldForm.code} onChange={(e) => setFieldForm({ ...fieldForm, code: e.target.value })} /></label><label>الاسم العربي<input required minLength={2} value={fieldForm.name_ar} onChange={(e) => setFieldForm({ ...fieldForm, name_ar: e.target.value })} /></label><label>الاسم الإنكليزي<input dir="ltr" required minLength={2} value={fieldForm.name_en} onChange={(e) => setFieldForm({ ...fieldForm, name_en: e.target.value })} /></label><label>نوع البيانات<select value={fieldForm.data_type} onChange={(e) => setFieldForm({ ...fieldForm, data_type: e.target.value, is_multi_value: e.target.value === "multi_enum" || fieldForm.is_multi_value })}>{["text", "integer", "decimal", "boolean", "date", "enum", "multi_enum", "reference", "json"].map((type) => <option key={type}>{type}</option>)}</select></label><label>الوحدة<input value={fieldForm.unit_code} onChange={(e) => setFieldForm({ ...fieldForm, unit_code: e.target.value })} /></label><label>سياسة القيمة المفقودة<select value={fieldForm.missing_value_policy} onChange={(e) => setFieldForm({ ...fieldForm, missing_value_policy: e.target.value })}>{["block_publish", "lower_confidence", "show_unknown", "hide"].map((policy) => <option key={policy}>{policy}</option>)}</select></label><label className="taxonomy-wide">القيم المسموحة (سطر لكل قيمة)<textarea rows={4} value={fieldForm.allowed_values} onChange={(e) => setFieldForm({ ...fieldForm, allowed_values: e.target.value })} /></label><label className="taxonomy-check"><input type="checkbox" checked={fieldForm.is_searchable} onChange={(e) => setFieldForm({ ...fieldForm, is_searchable: e.target.checked })} /> قابل للبحث</label><label className="taxonomy-check"><input type="checkbox" checked={fieldForm.is_comparable} onChange={(e) => setFieldForm({ ...fieldForm, is_comparable: e.target.checked })} /> قابل للمقارنة</label><label className="taxonomy-check"><input type="checkbox" checked={fieldForm.is_recommendation_input} onChange={(e) => setFieldForm({ ...fieldForm, is_recommendation_input: e.target.checked })} /> يدخل في الترشيح</label></div>
            <div className="queue-actions taxonomy-field-submit"><button className="primary" type="submit" disabled={!!busy}>{busy === "field" ? "جارٍ الحفظ…" : selectedField ? "حفظ الحقل" : "حفظ الحقل الجديد"}</button>{selectedField && nextStatuses[selectedField.status].map((status) => <button type="button" key={status} disabled={!!busy} onClick={() => transition("field", selectedField, status)}>نقل إلى {statusLabels[status]}</button>)}</div>
          </div>
        </div>
      </form>
    </section>
  </section>;
}
