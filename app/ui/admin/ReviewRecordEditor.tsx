"use client";
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */

import { RecordForm } from "@/app/ui/admin/RecordForm";
import { useReviewRecordEditorController } from "@/app/ui/admin/useReviewRecordEditorController";
import type { ProductKind } from "@/lib/record-capability-types";

const organizationRoleLabels: Record<string, string> = {
  cafe: "مقهى",
  seller: "بائع",
  roaster: "محمصة",
  equipment_supplier: "مورد معدات",
  manufacturer: "مصنّع",
  importer: "مستورد",
  service_provider: "مزود خدمة",
};

const entityPresentation: Record<string, { title: string; note: string; className: string }> = {
  products: { title: "بطاقة المنتج الرئيسية", note: "هوية ومواصفات مشتركة بين جميع البائعين؛ لا يوضع السعر هنا.", className: "master-product-context" },
  offers: { title: "عرض بائع مرتبط بمنتج", note: "السعر والتوفر وصور هذا البائع فقط؛ لا ينشئ منتجاً جديداً.", className: "seller-offer-context" },
  organizations: { title: "سجل جهة أو بائع", note: "هوية الجهة وفروعها وأدوارها داخل الدليل.", className: "organization-context" },
  brands: { title: "سجل علامة تجارية", note: "تحدد عائلة المنتجات التي يجوز ربطها بهذه العلامة.", className: "brand-context" },
  contents: { title: "محتوى تعليمي", note: "مقال أو دليل أو درس مستقل عن المنتجات التجارية.", className: "content-context" },
  origin_claims: { title: "مصدر قهوة", note: "ادعاء منشأ مرتبط بمنتج قهوة محدد ومصدر موثق.", className: "origin-context" },
};

type ReviewRecordEditorProps = {
  entity: string;
  id: string;
  canRestore: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function ReviewRecordEditor({ entity, id, canRestore, onClose, onSaved }: ReviewRecordEditorProps) {
  const controller = useReviewRecordEditorController({ entity, id, onSaved, onClose });
  const {
    data,
    attributes,
    setAttributes,
    setEditorContract,
    issueUpdates,
    setIssueUpdates,
    message,
    working,
    mediaWorking,
    editorCategoryId,
    setEditorCategoryId,
    revisionKey,
    save,
    addMedia,
    deleteMedia,
    restoreRevision,
  } = controller;

  const record = data?.record || {};
  const firstLocation = record.locations?.[0] || {};
  const references = data?.references || {};
  const editorContract = controller.editorContract;
  const matchingBrands = (references.brands || []).filter((brand: any) => editorContract?.allowed_brand_ids.includes(brand.id) && (!brand.product_kinds?.length || brand.product_kinds.includes(record.product_kind)));
  const editorContext = entityPresentation[entity] || { title: "سجل بيانات", note: "راجع نوع السجل قبل التعديل.", className: "generic-context" };

  return <div className="record-editor-backdrop" role="dialog" aria-modal="true" aria-label="فتح وتدقيق السجل">
    <section className="record-editor" data-workspace-contract="command-master-inspector-v1" data-governed-inspector="true">
      <div className="section-head"><div><span className="eyebrow">مراجعة تفصيلية</span><h2>{editorContext.title}</h2></div><button type="button" onClick={onClose}>إغلاق</button></div>
      <div className={`entity-context-banner ${editorContext.className}`}><div><b>{editorContext.title}</b><span>{editorContext.note}</span></div><div><b>{entity === "offers" ? record.products?.name_ar || "عرض" : record.name_ar || record.title_ar || "السجل"}</b>{entity === "offers" && <span>البائع: {record.organizations?.name_ar || "غير محدد"}</span>}</div></div>
      {!data && !message && <p role="status">جارٍ تحميل جميع الحقول والمصادر…</p>}
      {message && <p className="admin-message" role="status">{message}</p>}

      {data && <form key={revisionKey} className="record-edit-form" onSubmit={save}>
        <div className="record-status-line"><b>الحالة الحالية: {record.status || "مرتبط بالمنتج"}</b><span>المعرف: {id}</span></div>

        {entity === "organizations" && <>
          <label>الاسم العربي<input name="name_ar" defaultValue={record.name_ar || ""} required /></label>
          <label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
          <label>الموقع الإلكتروني<input name="website_url" type="url" defaultValue={record.website_url || ""} /></label>
          <label>الهاتف<input name="phone" defaultValue={record.phone || ""} /></label>
          <label>البريد<input name="email" type="email" defaultValue={record.email || ""} /></label>
          <label>المنطقة<input name="district_ar" defaultValue={firstLocation.district_ar || ""} /></label>
          <label className="wide">العنوان<input name="address_ar" defaultValue={firstLocation.address_ar || ""} required /></label>
          <label className="wide">الوصف<textarea name="description_ar" rows={4} defaultValue={record.description_ar || ""} /></label>
        </>}

        {entity === "brands" && <>
          <label>اسم العلامة بالعربية<input name="name_ar" defaultValue={record.name_ar || ""} required /></label>
          <label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
          <label>عائلة العلامة<select name="product_kind" defaultValue={record.brand_product_kinds?.[0]?.product_kind || ""} required><option value="">اختر</option><option value="roasted_coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumable">مستهلكات</option><option value="care_product">عناية وصيانة</option><option value="replacement_part">قطع غيار</option></select></label>
          <label>المصنّع أو الجهة المالكة<select name="manufacturer_organization_id" defaultValue={record.manufacturer_organization_id || ""}><option value="">غير محددة</option>{(references.organizations || []).map((organization: any) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select></label>
          <label className="wide">الموقع الرسمي<input name="website_url" type="url" defaultValue={record.website_url || ""} /></label>
        </>}

        {entity === "products" && <>
          <label>الاسم العربي<input name="name_ar" defaultValue={record.name_ar || ""} required /></label>
          <label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
          <RecordForm mode="edit" recordId={id} productKind={record.product_kind as ProductKind} categoryId={editorCategoryId} attributeValues={attributes} organizations={(references.organizations || []).map((organization: any) => ({ id: organization.id, name_ar: organization.name_ar }))} onCategoryChange={setEditorCategoryId} onAttributeValuesChange={setAttributes} onContractChange={setEditorContract} />
          <label>العلامة<select name="brand_id" defaultValue={record.brand_id || ""}><option value="">غير محددة</option>{matchingBrands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name_ar}</option>)}</select></label>
          <label>الجهة المنتجة أو المحمصة<select name="owner_organization_id" defaultValue={record.owner_organization_id || ""} required={record.product_kind === "roasted_coffee"}><option value="">غير محددة</option>{(references.organizations || []).map((organization: any) => <option key={organization.id} value={organization.id}>{organization.name_ar} · {(organization.organization_roles || []).map((role: any) => organizationRoleLabels[role.role_type] || role.role_type).join("، ")}</option>)}</select><small>اختر صاحب المنتج/المحمصة هنا. البائع وسعره يربطان من «عرض وسعر» ولا يوضعان في هذا الحقل.</small></label>
          <label>الموديل<input name="model_number" defaultValue={record.model_number || ""} /></label>
          <label className="wide">الملخص<textarea name="summary_ar" rows={3} defaultValue={record.summary_ar || ""} /></label>
          <label className="wide">الوصف<textarea name="description_ar" rows={5} defaultValue={record.description_ar || ""} /></label>
        </>}

        {entity === "offers" && <>
          <div className="read-only-pair"><span>المنتج</span><b>{record.products?.name_ar}</b></div><div className="read-only-pair"><span>البائع</span><b>{record.organizations?.name_ar}</b></div>
          <label>السعر<input name="price" type="number" min="0" step="0.001" defaultValue={record.price ?? ""} required /></label><label>العملة<input name="currency_code" value="IQD" readOnly /></label>
          <label>التوفر<select name="availability" defaultValue={record.availability || "unknown"}><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option><option value="unknown">غير متحقق</option></select></label>
          <label>تاريخ الرصد<input name="observed_at" type="datetime-local" defaultValue={String(record.observed_at || "").slice(0, 16)} /></label>
          <label className="wide">رابط توثيق العرض<input name="external_url" type="url" defaultValue={record.external_url || ""} required /><small>دليل داخلي للإدارة؛ المستخدم ينتقل إلى صفحة البائع داخل المنصة.</small></label>
        </>}

        {entity === "contents" && <><label>العنوان العربي<input name="title_ar" defaultValue={record.title_ar || ""} required /></label><label>العنوان الإنجليزي<input name="title_en" defaultValue={record.title_en || ""} /></label><label className="wide">المقتطف<textarea name="excerpt_ar" rows={2} defaultValue={record.excerpt_ar || ""} /></label><label className="wide">النص العربي<textarea name="body_ar" rows={12} minLength={20} defaultValue={record.body_ar || ""} required /></label></>}

        {entity === "origin_claims" && <><div className="read-only-pair"><span>منتج القهوة</span><b>{record.products?.name_ar}</b></div><div className="read-only-pair"><span>الدولة والمنطقة</span><b>{record.countries?.name_ar} · {record.coffee_regions?.name_ar || "غير محددة"}</b></div><label>المزرعة أو المنتج<input name="farm_or_producer_name" defaultValue={record.farm_or_producer_name || ""} /></label><label>مرجع الدفعة<input name="lot_reference" defaultValue={record.lot_reference || ""} /></label><label>المعالجة<input name="process_code" defaultValue={record.process_code || ""} /></label><label>السلالات<input name="variety_codes" defaultValue={(record.variety_codes || []).join("، ")} /></label><label>الموسم<input name="harvest_label" defaultValue={record.harvest_label || ""} /></label></>}

        <fieldset className="entity-media-manager wide"><legend>{entity === "offers" ? "صور عرض البائع" : entity === "products" ? "صور بطاقة المنتج الرئيسية" : "صور السجل"}</legend><div className="entity-media-grid">{(data.media || []).map((media: any) => <article key={media.id}><img src={media.url} alt={media.alt_ar} /><div><b>{media.alt_ar}</b><span>{media.rights_note}</span>{media.is_primary && <small>الصورة الرئيسية</small>}</div><button type="button" className="danger-action" disabled={mediaWorking === media.id} onClick={() => deleteMedia(media.id)}>فصل الصورة</button></article>)}{!(data.media || []).length && <p>لا توجد صورة مرتبطة بهذا السجل.</p>}</div><div className="media-upload-note">{entity === "offers" ? "هذه الصور تظهر في صفحة هذا البائع وعرضه فقط، ولا تستبدل صور المنتج الرئيسية." : "يمكن إضافة أكثر من صورة؛ أول صورة تصبح رئيسية تلقائياً. الصورة تحتاج وصفاً بديلاً وبيان حقوق واضح."} الفصل لا يحذف ملف الأصل؛ الإتلاف النهائي يتم فقط من Media Vault بعد الحجر والاحتفاظ والموافقة.</div></fieldset>

        <fieldset className="source-review wide"><legend>المصادر المحفوظة</legend>{data.sources?.length ? data.sources.map((link: any) => <article key={link.id}><b>{link.source_records?.title}</b><span>{link.source_records?.source_type} · {link.source_records?.publisher} · {link.source_records?.accessed_at}</span>{link.source_records?.url && <a href={link.source_records.url} target="_blank" rel="noreferrer">فتح المصدر</a>}<p>{link.source_records?.evidence_excerpt || "لا توجد ملاحظة دليل."}</p></article>) : <p className="danger-text">لا يوجد مصدر مرتبط؛ لن يكون السجل جاهزاً للنشر.</p>}</fieldset>

        {data.qualityIssues?.length > 0 && <fieldset className="quality-issue-editor wide"><legend>ملاحظات الجودة المانعة</legend><p>بصلاحية المدير يمكنك توثيق قرار كل ملاحظة، وبعد الحفظ تزول من موانع النشر.</p>{data.qualityIssues.map((issue: any) => { const update = issueUpdates.find((item) => item.id === issue.id); return <article key={issue.id}><b>{issue.severity} · {issue.message_ar}</b><select value={update?.status || ""} onChange={(event) => setIssueUpdates((current) => current.map((item) => item.id === issue.id ? { ...item, status: event.target.value } : item))}><option value="">تبقى مفتوحة</option><option value="fixed">تم التصحيح</option><option value="accepted">مقبولة بقرار إداري</option><option value="dismissed">مرفوضة كتنبيه غير منطبق</option></select><input value={update?.resolutionNote || ""} onChange={(event) => setIssueUpdates((current) => current.map((item) => item.id === issue.id ? { ...item, resolutionNote: event.target.value } : item))} placeholder="سبب القرار أو ما تم تصحيحه" /></article>; })}</fieldset>}

        <button className="primary" type="submit" disabled={working}>{working ? "جارٍ الحفظ…" : "حفظ والعودة إلى الطابور"}</button>
      </form>}

      {data?.history?.length > 0 && <details className="record-revision-history"><summary><b>سجل التغييرات والنسخ السابقة</b><span>{data.history.length} عملية</span></summary><p>الاستعادة تعيد الحقول الأساسية فقط؛ الصور والعلاقات تبقى محفوظة لتجنب فقدان البيانات.</p>{data.history.map((event: any) => <article key={event.id}><div><b>{event.action}</b><span>{new Date(event.created_at).toLocaleString("ar-IQ")}</span></div>{canRestore && event.before_data && <button type="button" disabled={working} onClick={() => restoreRevision(event.id)}>استعادة هذه النسخة</button>}</article>)}</details>}

      {data && <form className="entity-media-upload" onSubmit={addMedia} noValidate>
        <h3>إدخال أصل جديد إلى Media Vault</h3>
        <p className="wide media-upload-note">يذهب الأصل مباشرة إلى حجر خاص. يفحص الخادم التوقيع الحقيقي والأبعاد والحجم والبصمة SHA-256، ثم ينشئ نسخة منقحة خاصة لا تصبح عامة قبل الاعتماد.</p>
        <label>1. ملف الصورة<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" /></label>
        <label>2. الوصف البديل<input name="altAr" maxLength={300} placeholder="مثال: مطحنة DF54 V4 سوداء من الأمام" /></label>
        <label>3. أساس الحقوق<select name="rightsBasis"><option value="">اختر أساساً موثقاً</option><option value="creator_owned">ملكية المنشئ</option><option value="explicit_written_permission">إذن كتابي</option><option value="exclusive_license">ترخيص حصري</option><option value="nonexclusive_license">ترخيص غير حصري</option><option value="manufacturer_press_kit">حزمة إعلامية للمصنّع</option><option value="open_license">رخصة مفتوحة</option><option value="public_domain">ملكية عامة</option></select></label>
        <label>مالك حقوق النشر<input name="copyrightOwner" maxLength={300} placeholder="اسم المصور أو الشركة" /></label>
        <label>رابط المصدر<input name="sourceUrl" type="url" placeholder="https://…" /></label>
        <label>رابط الرخصة<input name="licenseUrl" type="url" placeholder="مطلوب للرخصة المفتوحة" /></label>
        <label className="wide">مرجع الإذن المكتوب<textarea name="permissionEvidence" rows={2} maxLength={2000} /></label>
        <label className="check wide"><input name="attested" type="checkbox" /> أقر بامتلاك حق النشر والاستخدام التجاري وإنشاء النسخة المنقحة، وبصحة هذه البيانات، وبإمكان تقييد الأصل عند مطالبة قانونية.</label>
        <button type="submit" disabled={mediaWorking === "upload"}>{mediaWorking === "upload" ? "جارٍ الحجر والفحص…" : "رفع الأصل إلى الحجر وفحصه"}</button>
      </form>}
    </section>
  </div>;
}
