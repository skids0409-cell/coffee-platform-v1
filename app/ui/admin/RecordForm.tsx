"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProductKind, RecordCapabilityContract } from "@/lib/record-capability-types";

type AttributeValues = Record<string, string>;

type RecordFormProps = {
  mode: "create" | "edit";
  productKind: ProductKind;
  recordId?: string;
  categoryId: string;
  attributeValues: AttributeValues;
  organizations: Array<{ id: string; name_ar: string }>;
  onCategoryChange: (categoryId: string) => void;
  onAttributeValuesChange: (values: AttributeValues) => void;
  onContractChange: (contract: RecordCapabilityContract | null) => void;
};

const kindLabels: Record<ProductKind, string> = {
  roasted_coffee: "قهوة محمصة",
  equipment: "معدات",
  consumable: "مستهلكات",
  care_product: "عناية وصيانة",
  replacement_part: "قطع غيار",
};

const optionLabels: Record<string, string> = {
  whole: "حبوب كاملة", ground: "مطحونة", true: "نعم", false: "لا",
  manual: "يدوي", electric: "كهربائي", other: "آخر",
};

function MultiValue({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const selected = value.split(/,\s*/).filter(Boolean);
  return <div className="multi-choice-grid">{options.map((option) => <label className="multi-choice" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => onChange((selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]).join(", "))} /><span>{optionLabels[option] || option}</span></label>)}</div>;
}

export function RecordForm(props: RecordFormProps) {
  const { productKind, mode, recordId, categoryId, onCategoryChange, onContractChange } = props;
  const [contract, setContract] = useState<RecordCapabilityContract | null>(null);
  const [familyId, setFamilyId] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ productKind, mode });
    if (recordId) params.set("recordId", recordId);
    fetch(`/api/admin/record-capabilities?${params}`, { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.reason || "contract_load_failed");
      if (!active) return;
      const next = result.contract as RecordCapabilityContract;
      setContract(next);
      onContractChange(next);
      const selectedCategoryId = categoryId;
      const selected = next.categories.find((category) => category.id === selectedCategoryId);
      setFamilyId(selected?.family_id || "");
      if (!selectedCategoryId && next.selection_policy.shape === "direct_category" && next.categories.length === 1) onCategoryChange(next.categories[0].id);
      setState("ready");
    }).catch(() => {
      if (!active) return;
      setContract(null);
      onContractChange(null);
      setState("error");
    });
    return () => { active = false; };
  }, [productKind, mode, recordId, categoryId, onCategoryChange, onContractChange]);

  const categories = useMemo(() => {
    if (!contract) return [];
    return contract.selection_policy.family_required ? contract.categories.filter((category) => category.family_id === familyId) : contract.categories;
  }, [contract, familyId]);
  const fields = contract?.attributes_by_category[props.categoryId] || [];
  const legacyConflict = contract?.record_state === "legacy_conflict";
  const visibleState = contract?.product_kind === productKind && contract.mode === mode ? state : "loading";
  const update = (fieldId: string, value: string) => props.onAttributeValuesChange({ ...props.attributeValues, [fieldId]: value });

  return <fieldset className="attribute-editor wide" data-record-capability-contract="phase2.v1">
    <legend>التصنيف والمواصفات — عقد موحّد</legend>
    <input type="hidden" name="category_id" value={props.categoryId} />
    <input type="hidden" name="contract_revision" value={contract?.contract_revision || ""} />
    <label>نوع المنتج<input value={kindLabels[props.productKind]} readOnly /></label>
    {visibleState === "loading" && <p className="wide" role="status">جارٍ تحميل عقد التصنيف المعتمد…</p>}
    {visibleState === "error" && <p className="danger-text wide" role="alert">تعذر تحميل عقد التصنيف. أعد فتح النموذج قبل الحفظ.</p>}
    {legacyConflict && <p className="danger-text wide" role="alert">السجل يحمل تصنيفاً تاريخياً غير متوافق. يمكن مراجعة الحقول الآمنة، لكن يلزم مسار إعادة تصنيف قبل النشر.</p>}
    {contract?.selection_policy.family_required && <label>العائلة الرئيسية<select value={familyId} disabled={visibleState !== "ready" || legacyConflict} onChange={(event) => { setFamilyId(event.target.value); props.onCategoryChange(""); props.onAttributeValuesChange({}); }} required><option value="">اختر العائلة</option>{contract.families.map((family) => <option key={family.id} value={family.id}>{family.name_ar}</option>)}</select></label>}
    <label>الفئة الدقيقة<select value={props.categoryId} disabled={visibleState !== "ready" || legacyConflict || Boolean(contract?.selection_policy.family_required && !familyId)} onChange={(event) => { props.onCategoryChange(event.target.value); props.onAttributeValuesChange({}); }} required><option value="">{contract?.selection_policy.family_required && !familyId ? "اختر العائلة أولاً" : "اختر الفئة"}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label>
    {props.categoryId && <div className="wide"><p>المواصفات التالية صادرة من عقد الخادم للفئة المختارة. لا تُقبل حقول خارج هذا النطاق.</p><div className="attribute-editor">{fields.map((field) => {
      const value = props.attributeValues[field.id] || "";
      return <label key={field.id}><span>{field.name_ar}{field.is_required_for_publish ? " — مطلوبة للنشر" : " — اختيارية"}</span>{field.data_type === "enum" ? <select value={value} onChange={(event) => update(field.id, event.target.value)}><option value="">غير محدد</option>{field.allowed_values.map((option) => <option value={option} key={option}>{optionLabels[option] || option}</option>)}</select> : field.data_type === "multi_enum" && field.allowed_values.length ? <MultiValue value={value} options={field.allowed_values} onChange={(next) => update(field.id, next)} /> : field.data_type === "reference" && field.code === "roaster_org_id" ? <select value={value.split(",")[0] || ""} onChange={(event) => update(field.id, event.target.value)}><option value="">غير محدد</option>{props.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select> : field.data_type === "boolean" ? <select value={value} onChange={(event) => update(field.id, event.target.value)}><option value="">غير محدد</option><option value="true">نعم</option><option value="false">لا</option></select> : <input type={["integer", "decimal"].includes(field.data_type) ? "number" : field.data_type === "date" ? "date" : "text"} value={value} onChange={(event) => update(field.id, event.target.value)} placeholder={field.unit_code || "أدخل القيمة الموثقة"} />}</label>;
    })}</div></div>}
  </fieldset>;
}
