"use client";

import { useCallback, useMemo, useState } from "react";
import { RecordForm } from "@/app/ui/admin/RecordForm";
import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";
import type { ProductKind, RecordCapabilityContract } from "@/lib/record-capability-types";
import styles from "./DataCenterV2.module.css";

type ReferenceData = {
  categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null; catalog_product_kind: string | null }>;
  organizations: Array<{ id: string; name_ar: string; status: string; organization_roles?: Array<{ role_type: string }> }>;
  products: Array<{ id: string; name_ar: string; product_kind: string; status: string }>;
  brands: Array<{ id: string; name_ar: string; product_kinds?: string[] }>;
  countries: Array<{ code: string; name_ar: string; coffee_regions?: Array<{ id: string; name_ar: string }> }>;
};

type EntityType = "product" | "offer" | "organization" | "brand" | "content" | "origin";

type PendingDraft = {
  entityType: EntityType;
  label: string;
  payload: Record<string, unknown>;
  attributes?: Array<{ fieldId: string; value: string }>;
  contractRevision?: string;
};

const sourceTypes = [
  ["manufacturer", "المصنّع"],
  ["official_registry", "سجل رسمي"],
  ["organization", "الجهة نفسها"],
  ["seller", "البائع"],
  ["government", "جهة حكومية"],
  ["professional_body", "هيئة مهنية"],
  ["research", "بحث"],
  ["editorial", "تحرير المنصة"],
  ["other", "مصدر آخر"],
] as const;

const productKinds: Array<[ProductKind, string]> = [
  ["roasted_coffee", "قهوة محمصة"],
  ["equipment", "معدات"],
  ["consumable", "مستهلكات"],
  ["care_product", "عناية وصيانة"],
  ["replacement_part", "قطع غيار"],
];

const entityTabs: Array<[EntityType, string, string]> = [
  ["product", "بطاقة منتج رئيسية", "هوية ومواصفات مشتركة بلا سعر بائع"],
  ["offer", "عرض بائع", "منتج موجود + جهة العرض + السعر والتوفر"],
  ["organization", "جهة", "هوية وموقع ودور تشغيلي"],
  ["brand", "علامة تجارية", "هوية العلامة ونطاق المنتج"],
  ["origin", "مصدر قهوة", "ادعاء منشأ مرتبط بمنتج موجود"],
  ["content", "محتوى", "مقال أو دليل أو درس أو قاموس"],
];

function SourceFields() {
  return <>
    <label>اسم المصدر<input name="source_label" minLength={3} maxLength={180} required /></label>
    <label>نوع المصدر<select name="source_type" defaultValue="editorial">{sourceTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    <label>رابط المصدر<input name="source_url" type="url" placeholder="https://…" /></label>
    <label className={styles.wide}>ملاحظة الدليل<textarea name="evidence_note" rows={2} placeholder="ما الذي يثبته هذا المصدر؟" /></label>
    <label className={`${styles.check} ${styles.wide}`}><input name="sourceConfirmed" type="checkbox" required />راجعت المصدر وأؤكد أن هذه الحقائق قابلة للتدقيق</label>
  </>;
}

function payloadFromForm(form: FormData) {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key === "sourceConfirmed" || key === "contract_revision" || key === "category_id") continue;
    if (typeof value === "string") payload[key] = value.trim();
  }
  return payload;
}

export function CatalogIntakeV2({ reference, onCreated }: { reference: ReferenceData; onCreated: () => Promise<void> }) {
  const [entityType, setEntityType] = useState<EntityType>("product");
  const [pending, setPending] = useState<PendingDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [productKind, setProductKind] = useState<ProductKind>("roasted_coffee");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productAttributes, setProductAttributes] = useState<Record<string, string>>({});
  const [productContract, setProductContract] = useState<RecordCapabilityContract | null>(null);
  const [originCountry, setOriginCountry] = useState("");

  const onCategoryChange = useCallback((categoryId: string) => setProductCategoryId(categoryId), []);
  const onAttributesChange = useCallback((values: Record<string, string>) => setProductAttributes(values), []);
  const onContractChange = useCallback((contract: RecordCapabilityContract | null) => setProductContract(contract), []);

  const productOrganizations = useMemo(() => reference.organizations.map(({ id, name_ar }) => ({ id, name_ar })), [reference.organizations]);
  const allowedBrands = useMemo(() => {
    if (!productContract) return [];
    const allowed = new Set(productContract.allowed_brand_ids);
    return reference.brands.filter((brand) => allowed.has(brand.id));
  }, [productContract, reference.brands]);
  const originRegions = useMemo(() => reference.countries.find((country) => country.code === originCountry)?.coffee_regions || [], [originCountry, reference.countries]);

  const stage = (event: React.FormEvent<HTMLFormElement>, type: Exclude<EntityType, "product">) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = payloadFromForm(form);
    const labels: Record<EntityType, string> = {
      product: "منتج",
      offer: `عرض ${reference.products.find((item) => item.id === payload.product_id)?.name_ar || "منتج"}`,
      organization: String(payload.name_ar || "جهة"),
      brand: String(payload.name_ar || "علامة"),
      content: String(payload.title_ar || "محتوى"),
      origin: `منشأ ${reference.products.find((item) => item.id === payload.product_id)?.name_ar || "منتج"}`,
    };
    setPending({ entityType: type, label: labels[type], payload });
    setMessage("المعاينة جاهزة. لم تُحفظ المسودة بعد.");
  };

  const stageProduct = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productContract || !productCategoryId) {
      setMessage("يجب تحميل عقد المنتج واختيار الفئة الدقيقة قبل المعاينة.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const payload = payloadFromForm(form);
    payload.product_kind = productKind;
    payload.category_id = productCategoryId;
    const attributes = Object.entries(productAttributes).filter(([, value]) => value.trim() !== "").map(([fieldId, value]) => ({ fieldId, value }));
    setPending({ entityType: "product", label: String(payload.name_ar || "منتج"), payload, attributes, contractRevision: productContract.contract_revision });
    setMessage("المعاينة جاهزة. بطاقة المنتج ما زالت غير محفوظة.");
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_catalog_draft",
        entityType: pending.entityType,
        payload: pending.payload,
        attributes: pending.attributes,
        contractRevision: pending.contractRevision,
        sourceConfirmed: true,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      const reason = String(data.reason || "");
      setMessage(reason.startsWith("duplicate_") ? "رفض الخادم إنشاء نسخة مكررة. افتح السجل الموجود بدلاً من إنشاء هوية جديدة." : reason === "contract_revision_stale" ? "تغيّر عقد المنتج على الخادم. أعد تحميل النموذج قبل الحفظ." : "رفض الخادم إنشاء المسودة وفق عقد الكيان الحالي.");
      return;
    }
    setPending(null);
    setMessage("تم إنشاء المسودة وتسجيل مصدرها. لا يظهر شيء للعميل قبل المراجعة والنشر.");
    await onCreated();
  };

  return <section className={styles.panel} data-catalog-intake-v2="structured" data-freeform-canonical-reference="false">
    <div className={styles.panelHead}>
      <div><h2>الإدخال المنظم للكتالوج</h2><p className={styles.muted}>كل نوع له نموذج مستقل. مفاتيح السجلات تبقى داخل قيم الخيارات ولا يكتب المشغل UUID.</p></div>
      <span className={styles.badge}>Draft only</span>
    </div>

    <div className={styles.entityTabs} role="tablist" aria-label="نوع السجل الجديد">
      {entityTabs.map(([value, label, description]) => <button type="button" role="tab" aria-selected={entityType === value} data-active={entityType === value} key={value} onClick={() => { setEntityType(value); setPending(null); setMessage(""); }}><b>{label}</b><small>{description}</small></button>)}
    </div>

    {message && <div className={styles.notice} role="status">{message}</div>}

    {entityType === "product" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={stageProduct}>
      <label>نوع المنتج<select value={productKind} onChange={(event) => { setProductKind(event.target.value as ProductKind); setProductCategoryId(""); setProductAttributes({}); setProductContract(null); }} required>{productKinds.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>الاسم العربي<input name="name_ar" minLength={2} maxLength={180} required /></label>
      <label>الاسم الإنجليزي<input name="name_en" maxLength={180} /></label>
      <label>العلامة<select name="brand_id" defaultValue=""><option value="">غير محددة</option>{allowedBrands.map((brand) => <option value={brand.id} key={brand.id}>{brand.name_ar}</option>)}</select></label>
      <label>الجهة المالكة/المنتجة<select name="owner_organization_id" defaultValue=""><option value="">غير محددة</option>{reference.organizations.map((org) => <option value={org.id} key={org.id}>{org.name_ar}</option>)}</select></label>
      <label>رقم الموديل<input name="model_number" maxLength={120} /></label>
      <label className={styles.wide}>ملخص عربي<textarea name="summary_ar" rows={2} /></label>
      <label className={styles.wide}>الوصف العربي<textarea name="description_ar" rows={4} /></label>
      <div className={styles.wide}><RecordForm mode="create" productKind={productKind} categoryId={productCategoryId} attributeValues={productAttributes} organizations={productOrganizations} onCategoryChange={onCategoryChange} onAttributeValuesChange={onAttributesChange} onContractChange={onContractChange} /></div>
      <SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة بطاقة المنتج</button></div>
    </form>}

    {entityType === "offer" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={(event) => stage(event, "offer")}>
      <label>المنتج الرئيسي<select name="product_id" required defaultValue=""><option value="">اختر منتجاً موجوداً</option>{reference.products.map((product) => <option value={product.id} key={product.id}>{product.name_ar}</option>)}</select></label>
      <label>جهة العرض<select name="seller_organization_id" required defaultValue=""><option value="">اختر الجهة</option>{reference.organizations.map((org) => <option value={org.id} key={org.id}>{org.name_ar}</option>)}</select></label>
      <label>السعر<input name="price" type="number" min="0" step="0.001" /></label>
      <label>العملة<select name="currency_code" defaultValue="IQD"><option value="IQD">IQD</option><option value="USD">USD</option></select></label>
      <label>التوفر<select name="availability" defaultValue="unknown"><option value="unknown">غير معروف</option><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option></select></label>
      <label>رابط إثبات العرض<input name="external_url" type="url" required /></label>
      <SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة عرض البائع</button></div>
    </form>}

    {entityType === "organization" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={(event) => stage(event, "organization")}>
      <label>الاسم العربي<input name="name_ar" minLength={2} required /></label><label>الاسم الإنجليزي<input name="name_en" /></label>
      <label>الدور<select name="role_type" defaultValue="cafe"><option value="cafe">مقهى</option><option value="roaster">محمصة</option><option value="seller">بائع</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مزود خدمة</option></select></label>
      <label>العنوان في بغداد<input name="address_ar" minLength={3} required /></label><label>المنطقة<input name="district_ar" /></label><label>الهاتف<input name="phone" /></label><label>البريد<input name="email" type="email" /></label><label>الموقع<input name="website_url" type="url" /></label>
      <label className={styles.wide}>وصف عربي<textarea name="description_ar" rows={3} /></label><SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة الجهة</button></div>
    </form>}

    {entityType === "brand" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={(event) => stage(event, "brand")}>
      <label>الاسم العربي<input name="name_ar" minLength={2} required /></label><label>الاسم الإنجليزي<input name="name_en" /></label><label>نطاق المنتج<select name="product_kind" defaultValue="roasted_coffee">{productKinds.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>الموقع الرسمي<input name="website_url" type="url" /></label><SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة العلامة</button></div>
    </form>}

    {entityType === "content" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={(event) => stage(event, "content")}>
      <label>نوع المحتوى<select name="content_type" defaultValue="article"><option value="article">مقال</option><option value="guide">دليل</option><option value="lesson">درس</option><option value="glossary">قاموس</option></select></label><label>العنوان العربي<input name="title_ar" minLength={3} required /></label><label>العنوان الإنجليزي<input name="title_en" /></label><label className={styles.wide}>المقتطف<textarea name="excerpt_ar" rows={2} /></label><label className={styles.wide}>النص العربي<textarea name="body_ar" minLength={20} rows={8} required /></label><SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة المحتوى</button></div>
    </form>}

    {entityType === "origin" && <form className={`${styles.form} ${styles.catalogForm}`} onSubmit={(event) => stage(event, "origin")}>
      <label>المنتج<select name="product_id" required defaultValue=""><option value="">اختر منتجاً</option>{reference.products.map((product) => <option value={product.id} key={product.id}>{product.name_ar}</option>)}</select></label>
      <label>الدولة<select name="country_code" required value={originCountry} onChange={(event) => setOriginCountry(event.target.value)}><option value="">اختر الدولة</option>{reference.countries.map((country) => <option value={country.code} key={country.code}>{country.name_ar}</option>)}</select></label>
      <label>المنطقة<select name="coffee_region_id" value={originRegions.length ? undefined : ""} defaultValue=""><option value="">غير محددة</option>{originRegions.map((region) => <option value={region.id} key={region.id}>{region.name_ar}</option>)}</select></label>
      <label>المزرعة/المنتج<input name="farm_or_producer_name" /></label><label>مرجع الدفعة<input name="lot_reference" /></label><label>طريقة المعالجة<input name="process_code" /></label><label>الأصناف<input name="variety_codes" placeholder="مفصولة بفاصلة" /></label><label>الموسم<input name="harvest_label" /></label><SourceFields />
      <div className={`${styles.formActions} ${styles.wide}`}><button className={styles.primary} type="submit">معاينة المنشأ</button></div>
    </form>}

    <StandardConfirmDialog open={Boolean(pending)} title={`تأكيد إنشاء مسودة ${pending?.label || ""}`} description="سيتم إنشاء مسودة موثقة فقط. لا يتم النشر ولا تجاوز المراجعة، وجميع معرفات العلاقات مأخوذة من قوائم السجلات المحملة من الخادم." confirmLabel="إنشاء المسودة" busy={busy} onCancel={() => setPending(null)} onConfirm={confirm} />
  </section>;
}
