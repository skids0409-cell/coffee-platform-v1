"use client";

import { useRef, useState } from "react";
import { RecordForm } from "@/app/ui/admin/RecordForm";
import type { DataCenterReference } from "@/app/ui/admin/DataCenterWorkspace";
import { allowedMediaExtension, mediaErrorMessage, type MediaRightsInput } from "@/app/ui/admin/catalog-media-client";
import { useCatalogDraftController, type PendingCatalogDraft } from "@/app/ui/admin/useCatalogDraftController";
import type { ProductKind, RecordCapabilityContract } from "@/lib/record-capability-types";

type CatalogDraftWorkspaceProps = {
  reference: DataCenterReference;
  onCreated: () => Promise<void>;
};

const entrySections = [
  ["coffee", "القهوة المحمصة"],
  ["equipment", "المعدات"],
  ["consumables", "المستهلكات"],
  ["care", "العناية والصيانة"],
  ["parts", "قطع الغيار"],
  ["directory", "الدليل والجهات"],
  ["brands", "العلامات التجارية"],
  ["offers", "العروض والأسعار"],
  ["origins", "مصادر القهوة"],
  ["learn", "التعلم والمعرفة"],
] as const;

const productKindLabel: Record<string, string> = {
  roasted_coffee: "قهوة محمصة",
  equipment: "معدات",
  consumable: "مستهلكات",
  care_product: "عناية وصيانة",
  replacement_part: "قطع غيار",
};

const sectionForProductKind: Record<ProductKind, string> = {
  roasted_coffee: "coffee",
  equipment: "equipment",
  consumable: "consumables",
  care_product: "care",
  replacement_part: "parts",
};

const roleLabel: Record<string, string> = {
  cafe: "مقهى",
  seller: "بائع",
  roaster: "محمصة",
  equipment_supplier: "مورد معدات",
  manufacturer: "مصنّع",
  importer: "مستورد",
  service_provider: "مزود خدمة",
};

export function CatalogDraftWorkspace({ reference, onCreated }: CatalogDraftWorkspaceProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [entityType, setEntityType] = useState("product");
  const [entrySection, setEntrySection] = useState("coffee");
  const [productKind, setProductKind] = useState<ProductKind>("roasted_coffee");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [draftAttributes, setDraftAttributes] = useState<Record<string, string>>({});
  const [productContract, setProductContract] = useState<RecordCapabilityContract | null>(null);
  const [offerProductKind, setOfferProductKind] = useState("roasted_coffee");
  const [offerFamilyId, setOfferFamilyId] = useState("");
  const [offerCategoryId, setOfferCategoryId] = useState("");
  const [offerCoffeeForm, setOfferCoffeeForm] = useState("");
  const [offerProductId, setOfferProductId] = useState("");
  const [localMessage, setLocalMessage] = useState("");
  const [pendingDraft, setPendingDraft] = useState<PendingCatalogDraft | null>(null);
  const controller = useCatalogDraftController({ onCreated });

  const categoryById = new Map(reference.categories.map((category) => [category.id, category]));
  const equipmentRoot = reference.categories.find((category) => category.code === "EQP");
  const equipmentFamilies = reference.categories.filter((category) => category.is_navigation_visible && category.navigation_parent_id === equipmentRoot?.id);
  const matchingBrands = reference.brands.filter((brand) => productContract?.allowed_brand_ids.includes(brand.id) && (!brand.product_kinds.length || brand.product_kinds.includes(productKind)));
  const offerProductsByKind = reference.products.filter((product) => product.product_kind === offerProductKind);
  const offerSubcategories = reference.categories.filter((category) => category.is_navigation_visible && category.navigation_parent_id === offerFamilyId);
  const productCoffeeForm = (product: DataCenterReference["products"][number]) => product.product_attribute_values?.find((item) => item.field_definitions?.code === "coffee_form")?.value_text || "";
  const offerProducts = offerProductsByKind.filter((product) => (!offerCategoryId || product.product_categories?.some((link) => {
    const assigned = categoryById.get(link.category_id);
    return assigned?.id === offerCategoryId || assigned?.catalog_filter_id === offerCategoryId;
  })) && (!offerCoffeeForm || productCoffeeForm(product) === offerCoffeeForm));
  const selectedOfferProduct = reference.products.find((product) => product.id === offerProductId);
  const sellerOrganizations = reference.organizations.filter((organization) => organization.organization_roles?.some((role) => ["seller", "cafe", "roaster", "equipment_supplier", "manufacturer", "importer"].includes(role.role_type)));

  const changeEntrySection = (value: string) => {
    setEntrySection(value);
    setLocalMessage("");
    controller.setMessage("");
    setPendingDraft(null);
    setProductCategoryId("");
    setProductContract(null);
    setDraftAttributes({});
    setOfferFamilyId("");
    setOfferCategoryId("");
    setOfferCoffeeForm("");
    setOfferProductId("");
    const productKinds: Partial<Record<string, ProductKind>> = { coffee: "roasted_coffee", equipment: "equipment", consumables: "consumable", care: "care_product", parts: "replacement_part" };
    if (productKinds[value]) { setEntityType("product"); setProductKind(productKinds[value]!); return; }
    if (value === "directory") setEntityType("organization");
    else if (value === "brands") setEntityType("brand");
    else if (value === "offers") setEntityType("offer");
    else if (value === "origins") setEntityType("origin");
    else setEntityType("content");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    controller.setMessage("");
    const formElement = event.currentTarget;
    const invalidField = Array.from(formElement.elements).find((element) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement ? !element.validity.valid : false) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    if (invalidField) {
      const fieldLabels: Record<string, string> = { name_ar: "الاسم العربي", address_ar: "العنوان", owner_organization_id: "الجهة المنتجة أو المحمصة", source_label: "اسم المصدر", sourceConfirmed: "تأكيد مراجعة المصدر", title_ar: "العنوان العربي", body_ar: "النص العربي", product_id: "المنتج", seller_organization_id: "البائع أو جهة العرض", price: "السعر", external_url: "رابط توثيق العرض", country_code: "الدولة" };
      const missingLabel = fieldLabels[invalidField.name] || invalidField.name || "مطلوب";
      setLocalMessage(`لا يمكن حفظ المسودة: أكمل حقل «${missingLabel}». تم تحديده باللون الأحمر.`);
      invalidField.setAttribute("aria-invalid", "true");
      invalidField.addEventListener("input", () => invalidField.removeAttribute("aria-invalid"), { once: true });
      invalidField.focus();
      invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const form = new FormData(formElement);
    const payload = Object.fromEntries([...form.entries()].filter(([key]) => !["sourceConfirmed", "entityType", "mediaFile", "mediaAltAr", "mediaRightsBasis", "mediaCopyrightOwner", "mediaSourceUrl", "mediaLicenseUrl", "mediaPermissionEvidence", "mediaAttested", "contract_revision"].includes(key)).map(([key, value]) => [key, String(value)]));
    const originalMediaFile = form.get("mediaFile");
    const mediaFile = originalMediaFile instanceof File ? originalMediaFile : null;
    if (mediaFile && mediaFile.size > 0) {
      if (!allowedMediaExtension(mediaFile.name)) { setLocalMessage(mediaErrorMessage("unsupported_type")); return; }
      if (String(form.get("mediaAltAr") || "").trim().length < 2) { setLocalMessage(mediaErrorMessage("alt_required")); return; }
      if (String(form.get("mediaRightsBasis") || "").length < 2 || String(form.get("mediaCopyrightOwner") || "").trim().length < 2) { setLocalMessage(mediaErrorMessage("rights_required")); return; }
      if (form.get("mediaAttested") !== "on") { setLocalMessage(mediaErrorMessage("attestation_required")); return; }
    }
    if (entityType === "product" && !productCategoryId) { setLocalMessage("اختر الفئة الدقيقة من شريط الإدخال أعلى النموذج قبل الحفظ."); return; }
    if (entityType === "product" && !productContract) { setLocalMessage("تعذر تحميل عقد التصنيف المعتمد. أعد فتح النموذج قبل الحفظ."); return; }
    const coffeeFormField = productContract?.attributes_by_category[productCategoryId]?.find((field) => field.code === "coffee_form");
    if (entityType === "product" && productKind === "roasted_coffee" && coffeeFormField && !draftAttributes[coffeeFormField.id]) { setLocalMessage("اختر شكل القهوة: حبوب كاملة أو مطحونة، قبل حفظ المسودة."); return; }
    if (entityType === "offer" && !offerProductId) { setLocalMessage("اختر المنتج من القائمة المفلترة قبل حفظ العرض."); return; }

    const mediaRights: MediaRightsInput = {
      rightsBasis: String(form.get("mediaRightsBasis") || ""),
      copyrightOwner: String(form.get("mediaCopyrightOwner") || ""),
      sourceUrl: String(form.get("mediaSourceUrl") || ""),
      licenseUrl: String(form.get("mediaLicenseUrl") || ""),
      permissionEvidence: String(form.get("mediaPermissionEvidence") || ""),
      attested: form.get("mediaAttested") === "on",
    };
    setPendingDraft({ entityType, payload, mediaFile, mediaAltAr: String(form.get("mediaAltAr") || ""), mediaRights, attributes: { ...draftAttributes }, contractRevision: productContract?.contract_revision || "" });
    setLocalMessage("راجع المعاينة أدناه. لم تُحفظ المسودة بعد.");
  };

  const confirmDraft = async () => {
    if (!pendingDraft) return;
    setLocalMessage("");
    const result = await controller.createPendingDraft(pendingDraft);
    if (!result.ok) return;
    formRef.current?.reset();
    setDraftAttributes({});
    setProductCategoryId("");
    setProductContract(null);
    setPendingDraft(null);
  };

  const visibleMessage = localMessage || controller.message;

  return <section className="catalog-draft-entry" data-workspace-contract="command-master-inspector-v1">
    <div className="record-nature-picker" aria-label="تحديد طبيعة الإدخال">
      <div><b>أولاً: ما طبيعة السجل؟</b><span>هذا الاختيار يمنع خلط بطاقة المنتج العامة مع سعر وصور بائع محدد.</span></div>
      <button type="button" className={entityType === "product" ? "active" : ""} onClick={() => changeEntrySection(sectionForProductKind[productKind])}><b>بطاقة منتج رئيسية</b><span>اسم، علامة، فئة ومواصفات مشتركة — بلا سعر بائع.</span></button>
      <button type="button" className={entityType === "offer" ? "active" : ""} onClick={() => changeEntrySection("offers")}><b>منتج لدى بائع</b><span>اختر بطاقة موجودة ثم اربط البائع والسعر وصوره الخاصة.</span></button>
    </div>

    <div className="data-entry-navigation">
      <div><span className="eyebrow">مدخل بيانات موحّد</span><h3>اختر القسم ثم الفئة الدقيقة</h3><p>نفس ترتيب وفلاتر «إدارة السجلات المنشورة» حتى يكون الإدخال والمراجعة متطابقين.</p></div>
      <label>قسم السجل<select value={entrySection} onChange={(event) => changeEntrySection(event.target.value)}>{entrySections.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      {entityType === "product" && <div className="read-only-pair"><span>نطاق التصنيف</span><b>{productKindLabel[productKind]}</b><small>سيُحمّل عقد الخادم داخل النموذج، وهو المصدر الوحيد للفئات والمواصفات المسموحة.</small></div>}
      {entityType === "offer" && <>
        <label>قسم المنتج<select value={offerProductKind === "roasted_coffee" ? "coffee" : "equipment"} onChange={(event) => { setOfferProductKind(event.target.value === "coffee" ? "roasted_coffee" : "equipment"); setOfferFamilyId(""); setOfferCategoryId(""); setOfferCoffeeForm(""); setOfferProductId(""); }}><option value="coffee">القهوة</option><option value="equipment">المعدات</option></select></label>
        {offerProductKind !== "roasted_coffee" && <><label>العائلة الرئيسية<select value={offerFamilyId} onChange={(event) => { setOfferFamilyId(event.target.value); setOfferCategoryId(""); setOfferProductId(""); }}><option value="">كل عوائل المعدات</option>{equipmentFamilies.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label><label>التصنيف الفرعي<select value={offerCategoryId} disabled={!offerFamilyId} onChange={(event) => { const selected = categoryById.get(event.target.value); setOfferCategoryId(event.target.value); if (selected?.catalog_product_kind) setOfferProductKind(selected.catalog_product_kind); setOfferProductId(""); }}><option value="">{offerFamilyId ? "كل التصنيفات الفرعية" : "اختر العائلة أولاً"}</option>{offerSubcategories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label></>}
        {offerProductKind === "roasted_coffee" && <label>شكل القهوة<select value={offerCoffeeForm} onChange={(event) => { setOfferCoffeeForm(event.target.value); setOfferProductId(""); }}><option value="">حبوب ومطحونة</option><option value="whole">حبوب كاملة</option><option value="ground">مطحونة</option></select></label>}
      </>}
    </div>

    {visibleMessage && <p className="admin-message" role="status">{visibleMessage}</p>}
    <div className="admin-scope-explainer"><b>هذه الواجهة لإدارة المنصة فقط</b><span>البائع أو الجهة يستخدم بوابة تقديم منفصلة؛ بياناته تدخل كمقترح ولا تصل للنشر دون مراجعتنا.</span></div>

    <form ref={formRef} className="catalog-draft-form" onSubmit={submit} noValidate data-governed-master="true">
      <input type="hidden" name="entityType" value={entityType} />

      {entityType === "organization" && <><label>نوع الجهة<select name="role_type" required><option value="roaster">محمصة</option><option value="cafe">مقهى</option><option value="seller">بائع</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مزود خدمة أو صيانة</option></select></label><label>الاسم العربي<input name="name_ar" minLength={2} maxLength={160} required /></label><label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label><label>المنطقة<input name="district_ar" maxLength={160} /></label><label className="wide">العنوان في بغداد<input name="address_ar" minLength={3} maxLength={400} required /></label><label>الهاتف<input name="phone" maxLength={80} /></label><label>البريد<input name="email" type="email" maxLength={200} /></label><label>الموقع الإلكتروني<input name="website_url" type="url" /></label><label className="wide">وصف الجهة<textarea name="description_ar" rows={4} /></label></>}

      {entityType === "brand" && <><label>عائلة العلامة<select name="product_kind" required><option value="roasted_coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumable">مستهلكات</option><option value="care_product">عناية وصيانة</option><option value="replacement_part">قطع غيار</option></select></label><label>اسم العلامة بالعربية<input name="name_ar" minLength={2} maxLength={160} required /></label><label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label><label>الموقع الرسمي<input name="website_url" type="url" /></label><p className="wide">تُحفظ العلامة كمسودة، ثم تظهر في طابور «العلامات التجارية». بعد اعتمادها ستظهر فقط مع عائلة المنتجات المحددة.</p></>}

      {entityType === "product" && <>
        <div className="catalog-stage-heading wide"><span>المرحلة 1</span><div><b>هوية المنتج</b><small>ما هو المنتج؟ وما الاسم الذي سيبحث عنه المستخدم؟</small></div></div>
        <fieldset className="catalog-form-stage wide"><legend>الهوية الأساسية</legend><div className="catalog-stage-grid"><div className="read-only-pair"><span>قسم المنتج</span><b>{productKindLabel[productKind]}</b><input type="hidden" name="product_kind" value={productKind} /></div><label>الاسم العربي<input name="name_ar" minLength={2} maxLength={160} required /></label><label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label><label>رقم الموديل<input name="model_number" maxLength={160} /></label></div></fieldset>
        <div className="catalog-stage-heading wide"><span>المرحلة 2</span><div><b>التصنيف والعلاقات</b><small>الفئة والعلامة والمنتِج؛ البائع يُربط لاحقاً من «عرض وسعر».</small></div></div>
        <RecordForm mode="create" productKind={productKind} categoryId={productCategoryId} attributeValues={draftAttributes} organizations={reference.organizations} onCategoryChange={setProductCategoryId} onAttributeValuesChange={setDraftAttributes} onContractChange={setProductContract} />
        <fieldset className="catalog-form-stage wide"><legend>التصنيف والملكية</legend><div className="catalog-stage-grid"><label>{productKind === "roasted_coffee" ? "علامة القهوة" : "العلامة التجارية"}<select name="brand_id"><option value="">غير محددة بعد</option>{matchingBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name_ar}</option>)}</select><small>{matchingBrands.length.toLocaleString("ar-IQ")} علامة منشورة لهذا النوع. أضف العلامة أولاً ولا تنسب المنتج إلى علامة غير صحيحة.</small><button className="inline-create-action" type="button" onClick={() => changeEntrySection("brands")}>+ إدخال علامة جديدة يدوياً</button></label><label className="wide">الجهة المنتجة أو المالكة للمنتج<select name="owner_organization_id" required={productKind === "roasted_coffee"}><option value="">غير محددة</option>{reference.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select><small>ليست جهة البيع. ظهور المنتج في متجر بائع داخل قهوتنا يحتاج عرضاً مرتبطاً ومنشوراً.</small></label></div></fieldset>
        <div className="catalog-stage-heading wide"><span>المرحلة 3</span><div><b>المحتوى والمواصفات</b><small>وصف المستخدم ثم الحقول المنظمة الخاصة بالفئة المختارة.</small></div></div>
        <fieldset className="catalog-form-stage wide"><legend>المحتوى الظاهر</legend><div className="catalog-stage-grid"><label className="wide">ملخص عربي <small>جملة قصيرة تظهر في بطاقات البحث والقوائم.</small><textarea name="summary_ar" rows={3} maxLength={1000} /></label><label className="wide">وصف عربي <small>تفاصيل المنتج التي تظهر في صفحته.</small><textarea name="description_ar" rows={5} maxLength={4000} /></label></div></fieldset>
        <div className="product-publication-path wide"><b>مسار الظهور العام</b><span>١) حفظ المنتج كمسودة ← ٢) تدقيقه واعتماده للنشر ← ٣) إذا كان يباع لدى جهة: إنشاء «عرض وسعر» وربطه بالمنتج والجهة ثم اعتماده. عندها يظهر في البحث وصفحة البائع.</span></div>
      </>}

      {entityType === "content" && <><label>نوع المحتوى<select name="content_type" required><option value="article">مقالة</option><option value="guide">دليل</option><option value="lesson">درس</option><option value="glossary">مصطلح</option></select></label><label>العنوان العربي<input name="title_ar" minLength={3} maxLength={200} required /></label><label>العنوان الإنجليزي<input name="title_en" maxLength={200} /></label><label className="wide">المقتطف<textarea name="excerpt_ar" rows={2} maxLength={1000} /></label><label className="wide">النص العربي<textarea name="body_ar" rows={8} minLength={20} maxLength={20000} required /></label></>}

      {entityType === "offer" && <><div className="offer-linking-guide wide"><b>ربط العرض بالمنتج والبائع</b><span>اختر العائلة ثم الفئة ثم المنتج. العرض لا ينشئ منتجاً جديداً؛ بل يربط المنتج الموجود بجهة تبيعه وسعره لديها.</span></div><label>1. المنتج<select name="product_id" value={offerProductId} onChange={(event) => setOfferProductId(event.target.value)} required><option value="">اختر المنتج</option>{offerProducts.map((product) => <option key={product.id} value={product.id}>{product.name_ar} · {product.status === "published" ? "منشور" : product.status === "in_review" ? "قيد المراجعة" : "مسودة"}</option>)}</select></label><label>2. البائع أو جهة العرض<select name="seller_organization_id" required><option value="">اختر البائع</option>{sellerOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name_ar} · {(organization.organization_roles || []).map((role) => roleLabel[role.role_type] || role.role_type).join("، ")}</option>)}</select></label>{selectedOfferProduct && <div className="offer-product-context wide"><b>{selectedOfferProduct.name_ar}</b><span>الفئة: {selectedOfferProduct.product_categories?.[0]?.categories?.name_ar || "غير محددة"}</span><span>العلامة: {selectedOfferProduct.brands?.name_ar || "غير محددة"}</span><span>المنتج/المالك: {selectedOfferProduct.organizations?.name_ar || "غير محدد"}</span><span className={selectedOfferProduct.status === "published" ? "ready-text" : "danger-text"}>{selectedOfferProduct.status === "published" ? "يظهر العرض للعامة بعد اعتماده" : "المنتج غير منشور؛ سيُحفظ العرض لكنه لن يظهر للعامة حتى نشر المنتج"}</span></div>}<label>السعر<input name="price" type="number" min="0" step="0.001" required /></label><label>العملة<input name="currency_code" value="IQD" readOnly /></label><label>التوفر<select name="availability" required><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option><option value="unknown">غير متحقق</option></select></label><label>رابط توثيق العرض<input name="external_url" type="url" required /><small>مرجع إداري للتحقق من السعر والتوفر؛ لا يظهر للمستخدم كوجهة شراء.</small></label><label>تاريخ الرصد<input name="observed_at" type="datetime-local" /></label></>}

      {entityType === "origin" && <><label>منتج القهوة<select name="product_id" required><option value="">اختر القهوة</option>{reference.products.filter((product) => product.product_kind === "roasted_coffee").map((product) => <option key={product.id} value={product.id}>{product.name_ar}</option>)}</select></label><label>الدولة<select name="country_code" required><option value="">اختر الدولة</option>{reference.countries.map((country) => <option key={country.code} value={country.code}>{country.name_ar}</option>)}</select></label><label>المنطقة<select name="coffee_region_id"><option value="">غير محددة</option>{reference.countries.flatMap((country) => country.coffee_regions.map((region) => <option key={region.id} value={region.id}>{country.name_ar} — {region.name_ar}</option>))}</select></label><label>المزرعة أو المنتج<input name="farm_or_producer_name" maxLength={300} /></label><label>المعالجة<input name="process_code" maxLength={120} /></label><label>السلالات، مفصولة بفاصلة<input name="variety_codes" maxLength={500} /></label><label>الموسم<input name="harvest_label" maxLength={120} /></label><label>مرجع الدفعة<input name="lot_reference" maxLength={160} /></label></>}

      {entityType === "product" && <div className="catalog-stage-heading wide"><span>المرحلة 4</span><div><b>المصدر والصورة</b><small>وثّق من أين جاءت البيانات، وارفع الصورة المرخصة مع وصفها وحقوقها.</small></div></div>}
      <fieldset className="source-fields"><legend>الدليل والمصدر</legend><p className="wide">المصدر هو المكان الذي أخذنا منه المعلومة، مثل صفحة المحمصة الرسمية أو موقع المصنّع أو صفحة البائع. لا يقصد به اسم الموظف الذي أدخل البيانات.</p><label>اسم المصدر<input name="source_label" minLength={3} maxLength={180} placeholder="مثال: صفحة قهوة العزاوي الرسمية" required /></label><label>نوع المصدر<select name="source_type" defaultValue="editorial"><option value="manufacturer">المصنّع الرسمي</option><option value="organization">الجهة أو المحمصة الرسمية</option><option value="seller">صفحة البائع</option><option value="research">بحث أو دراسة</option><option value="editorial">رصد ومراجعة فريق المنصة</option><option value="other">مصدر آخر</option></select></label><label>رابط المصدر<input name="source_url" type="url" /></label><label className="wide">ملاحظة الدليل<textarea name="evidence_note" rows={2} maxLength={1000} /></label></fieldset>
      <fieldset className="media-fields"><legend>الصورة والحقوق (اختياري)</legend><p className="wide">يُرفع الأصل كما هو إلى حجر خاص، ثم يفحص الخادم النوع الفعلي والأبعاد والحجم والبصمة SHA-256 ويزيل بيانات الموقع من النسخة المعدّة للنشر. لا يصبح الملف عاماً قبل اعتماد المراجع.</p><label className="wide">تحميل الصورة<input name="mediaFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" /></label><label>الوصف البديل للصورة<input name="mediaAltAr" maxLength={300} placeholder="مثال: مطحنة DF54 سوداء من الأمام" /></label><label>أساس الحقوق<select name="mediaRightsBasis" defaultValue=""><option value="">اختر أساساً موثقاً</option><option value="creator_owned">أنشأها رافع الملف ويملكها</option><option value="explicit_written_permission">إذن كتابي صريح</option><option value="exclusive_license">ترخيص حصري</option><option value="nonexclusive_license">ترخيص غير حصري</option><option value="manufacturer_press_kit">حزمة إعلامية للمصنّع</option><option value="open_license">رخصة مفتوحة</option><option value="public_domain">ملكية عامة</option></select></label><label>مالك حقوق النشر<input name="mediaCopyrightOwner" maxLength={300} placeholder="اسم المصور أو الشركة المالكة" /></label><label>رابط المصدر<input name="mediaSourceUrl" type="url" placeholder="https://…" /></label><label>رابط الرخصة المفتوحة<input name="mediaLicenseUrl" type="url" placeholder="مطلوب عند اختيار رخصة مفتوحة" /></label><label className="wide">مرجع الإذن المكتوب<textarea name="mediaPermissionEvidence" rows={2} maxLength={2000} placeholder="رقم العقد أو مكان حفظ رسالة الإذن؛ مطلوب للتراخيص والإذن المكتوب" /></label><label className="check wide"><input name="mediaAttested" type="checkbox" /> أقر أن لدي حق النشر والاستخدام التجاري وإنشاء نسخة منقحة، وأن المعلومات أعلاه صحيحة، وأقبل تقييد الملف أو إزالته عند ورود مطالبة قانونية.</label><small className="wide">إذا اخترت صورة تصبح بيانات الحقوق والإقرار إلزامية. الإقرار دليل تشغيلي ولا يحل محل الاستشارة القانونية.</small></fieldset>
      {entityType === "product" && <div className="catalog-stage-heading wide"><span>المرحلة 5</span><div><b>المراجعة والحفظ</b><small>سيُنشأ سجل مسودة فقط؛ راجعه من الطابور قبل النشر.</small></div></div>}
      <label className="check wide"><input name="sourceConfirmed" type="checkbox" required /> راجعت الحقول والمصدر وأوافق على إنشاء مسودة غير منشورة</label>
      <button type="submit" disabled={controller.working}>{controller.working ? "جارٍ الفحص…" : "معاينة المعلومات قبل الحفظ"}</button>
    </form>

    {pendingDraft && <section className="draft-confirmation" aria-live="polite" data-governed-inspector="true"><div className="section-head"><div><span className="eyebrow">الخطوة الأخيرة</span><h3>معاينة المسودة قبل إنشائها</h3></div><span className="draft-safety">لم تُحفظ بعد</span></div><p>راجع الهوية والعلاقات والمصدر والصورة. إذا وجدت خطأ ارجع وعدّل الحقول، وإذا كانت صحيحة أنشئ المسودة.</p><dl><div><dt>نوع السجل</dt><dd>{({ product: "بطاقة منتج رئيسية", offer: "عرض بائع وسعر", organization: "جهة في الدليل", brand: "علامة تجارية", content: "محتوى معرفي", origin: "مصدر قهوة" } as Record<string, string>)[pendingDraft.entityType]}</dd></div><div><dt>الاسم</dt><dd>{pendingDraft.payload.name_ar || pendingDraft.payload.title_ar || reference.products.find((item) => item.id === pendingDraft.payload.product_id)?.name_ar || "—"}</dd></div>{pendingDraft.payload.category_id && <div><dt>الفئة</dt><dd>{reference.categories.find((item) => item.id === pendingDraft.payload.category_id)?.name_ar || pendingDraft.payload.category_id}</dd></div>}{pendingDraft.payload.brand_id && <div><dt>العلامة</dt><dd>{reference.brands.find((item) => item.id === pendingDraft.payload.brand_id)?.name_ar || "—"}</dd></div>}{pendingDraft.payload.owner_organization_id && <div><dt>الجهة المالكة</dt><dd>{reference.organizations.find((item) => item.id === pendingDraft.payload.owner_organization_id)?.name_ar || "—"}</dd></div>}{pendingDraft.payload.seller_organization_id && <div><dt>البائع</dt><dd>{reference.organizations.find((item) => item.id === pendingDraft.payload.seller_organization_id)?.name_ar || "—"}</dd></div>}{pendingDraft.payload.price && <div><dt>السعر</dt><dd>{Number(pendingDraft.payload.price).toLocaleString("ar-IQ")} {pendingDraft.payload.currency_code || "IQD"}</dd></div>}<div><dt>المصدر</dt><dd>{pendingDraft.payload.source_label || "—"}</dd></div><div><dt>الصورة</dt><dd>{pendingDraft.mediaFile ? `${pendingDraft.mediaFile.name} · ${pendingDraft.mediaAltAr} · ${pendingDraft.mediaRights.copyrightOwner} · ${pendingDraft.mediaRights.rightsBasis}` : "لا توجد صورة في هذه المسودة"}</dd></div></dl><div className="queue-actions"><button className="primary" type="button" disabled={controller.working} onClick={confirmDraft}>{controller.working ? "جارٍ إنشاء المسودة…" : "تأكيد وإنشاء المسودة"}</button><button type="button" disabled={controller.working} onClick={() => { setPendingDraft(null); setLocalMessage("عُدّل وضع المعاينة؛ غيّر الحقول ثم افتح المعاينة من جديد."); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>العودة للتعديل</button></div></section>}
  </section>;
}
