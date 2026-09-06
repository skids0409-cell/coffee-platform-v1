"use client";

export type InactiveCatalogItem = {
  entity: string;
  id: string;
  label: string;
  status: string;
  updated_at: string;
};

type ArchiveWorkspaceProps = {
  items: InactiveCatalogItem[];
  canDelete: boolean;
  workingId: string;
  onOpen: (record: { entity: string; id: string }) => void;
  onRestoreDraft: (entity: string, id: string) => void;
  onDelete: (entity: string, id: string, label: string) => void;
  importArchive: React.ReactNode;
};

export function ArchiveWorkspace({ items, canDelete, workingId, onOpen, onRestoreDraft, onDelete, importArchive }: ArchiveWorkspaceProps) {
  return <>
    <section className="inactive-catalog" data-workspace-contract="command-master-inspector-v1" data-archive-domain="catalog-records">
      <div className="section-head"><div><span className="eyebrow">Catalog Archive</span><h2>سجلات الكتالوج المرفوضة والمؤرشفة</h2></div><span>{items.length} سجل كتالوج</span></div>
      <p>هذا العداد يخص سجلات الكتالوج فقط. دفعات الاستيراد لها سجل وعداد مستقلان أدناه. الأرشفة هي الإجراء اليومي الآمن، والحذف النهائي متاح للمدير الأعلى فقط وبعد التأكيد.</p>
      <div data-governed-master="true">
        {items.map((item) => <article key={`${item.entity}-${item.id}`}>
          <div><b>{item.label}</b><span>{item.status === "rejected" ? "مرفوض" : "مؤرشف"} · {new Date(item.updated_at).toLocaleDateString("ar-IQ")}</span></div>
          <div className="queue-actions">
            <button type="button" onClick={() => onOpen({ entity: item.entity, id: item.id })}>فتح وتعديل</button>
            <button type="button" disabled={workingId === item.id} onClick={() => onRestoreDraft(item.entity, item.id)}>إعادة لمسودة</button>
            {canDelete && <button type="button" className="danger-action" disabled={workingId === item.id} onClick={() => onDelete(item.entity, item.id, item.label)}>حذف نهائي</button>}
          </div>
        </article>)}
        {!items.length && <p>لا توجد سجلات كتالوج مؤرشفة أو مرفوضة حالياً.</p>}
      </div>
    </section>
    {importArchive}
  </>;
}
