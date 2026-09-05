"use client";

export type PublishedCatalogItem = {
  entity: string;
  section: string;
  group: string;
  id: string;
  label: string;
  meta: string;
  updated_at: string;
};

type RecordsWorkspaceProps = {
  items: PublishedCatalogItem[];
  visibleItems: PublishedCatalogItem[];
  publishedType: string;
  publishedGroup: string;
  publishedGroups: string[];
  publishedQuery: string;
  onTypeChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onQueryChange: (value: string) => void;
  onOpen: (record: { entity: string; id: string }) => void;
};

export function RecordsWorkspace({
  items,
  visibleItems,
  publishedType,
  publishedGroup,
  publishedGroups,
  publishedQuery,
  onTypeChange,
  onGroupChange,
  onQueryChange,
  onOpen,
}: RecordsWorkspaceProps) {
  return <section className="published-records-admin priority-section" id="operations-published" data-workspace-contract="master-detail-v1">
    <div className="section-head">
      <div><span className="eyebrow">القسم الأول · السجل الحي</span><h2>إدارة السجلات المنشورة</h2></div>
      <span>{items.length} سجل</span>
    </div>
    <p>التصفية هنا تستخدم فلسفة مركز الإدخال نفسها: عائلة السجل أولاً، ثم الفئة الدقيقة، ثم البحث بالاسم.</p>
    <div className="published-toolbar published-filter-grid">
      <label>قسم السجل
        <select value={publishedType} onChange={(event) => onTypeChange(event.target.value)}>
          <option value="all">كل الأقسام</option><option value="coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumables">مستهلكات</option><option value="care">عناية وصيانة</option><option value="parts">قطع غيار</option><option value="directory">الدليل والجهات</option><option value="brands">العلامات التجارية</option><option value="offers">العروض والأسعار</option><option value="origins">مصادر القهوة</option><option value="learn">التعلم والمعرفة</option>
        </select>
      </label>
      <label>الفئة المتوافقة
        <select value={publishedGroup} onChange={(event) => onGroupChange(event.target.value)}>
          <option value="all">كل فئات القسم</option>{publishedGroups.map((group) => <option value={group} key={group}>{group}</option>)}
        </select>
      </label>
      <label>البحث داخل النتائج<input value={publishedQuery} onChange={(event) => onQueryChange(event.target.value)} placeholder="اسم السجل أو الفئة" /></label>
    </div>
    <div className="published-result-summary"><b>{visibleItems.length.toLocaleString("ar-IQ")}</b><span>نتيجة مطابقة للفلاتر الحالية</span></div>
    <div className="published-record-list" data-governed-master="true">
      {visibleItems.slice(0, 200).map((item) => <article key={`${item.entity}-${item.id}`} className={`published-record-${item.entity}`}>
        <div>
          <span className="entity-kind-badge">{item.entity === "products" ? "بطاقة منتج رئيسية" : item.entity === "offers" ? "عرض بائع" : item.meta}</span>
          <b>{item.label}</b>
          <span>{item.group} · {item.meta} · المعرف {item.id} · آخر تحديث {new Date(item.updated_at).toLocaleDateString("ar-IQ")}</span>
        </div>
        <button type="button" onClick={() => onOpen({ entity: item.entity, id: item.id })}>{item.entity === "products" ? "تعديل بطاقة المنتج" : item.entity === "offers" ? "تعديل عرض البائع" : "تعديل المنشور"}</button>
      </article>)}
      {!visibleItems.length && <p>لا توجد سجلات مطابقة.</p>}
    </div>
  </section>;
}
