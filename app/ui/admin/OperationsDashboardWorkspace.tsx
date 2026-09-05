"use client";

export type QualitySuspectView = {
  id: string;
  entity: string;
  entityId?: string | null;
  label: string;
  severity: string;
  reason: string;
  recommendedAction?: string | null;
  issueDetails?: unknown;
};

type DashboardSummary = {
  recordsPendingReview: number;
  openIssues: number;
  missingProductImages: number;
  missingOfferImages: number;
};

type OperationsDashboardWorkspaceProps = {
  checks: Array<[string, string]>;
  summary: DashboardSummary;
  suspects: QualitySuspectView[];
  onOpenIssue: (issue: QualitySuspectView) => void;
  onOpenRecord: (record: { entity: string; id: string }) => void;
};

const editableEntities = ["products", "brands", "organizations", "offers", "contents", "origin_claims"];

export function OperationsDashboardWorkspace({ checks, summary, suspects, onOpenIssue, onOpenRecord }: OperationsDashboardWorkspaceProps) {
  return <section className="operations-dashboard" data-workspace-contract="command-master-inspector-v1">
    <div className="operations-grid">{checks.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div>
    <div className="operations-health-grid">
      <article><span>بانتظار المراجعة</span><b>{summary.recordsPendingReview}</b></article>
      <article><span>ملاحظات جودة مفتوحة</span><b>{summary.openIssues}</b></article>
      <article><span>بطاقات بلا صور</span><b>{summary.missingProductImages}</b></article>
      <article><span>عروض بلا صور خاصة</span><b>{summary.missingOfferImages}</b></article>
    </div>
    <div className="workflow-lane"><span>مسودة</span><i>←</i><span>فحص النواقص</span><i>←</i><span>معاينة</span><i>←</i><span>مراجعة</span><i>←</i><span>اعتماد ونشر</span><i>←</i><span>تعديل أو أرشفة</span></div>
    <section className="quality-desk" data-governed-master="true">
      <div className="section-head"><div><span className="eyebrow">قرار المالك مطلوب</span><h2>السجلات والملاحظات المشكوك فيها</h2></div><span>{suspects.length}</span></div>
      <p>كل ملاحظة قابلة للفتح والتدقيق. لا تختفي إلا بعد توثيق قرار المراجع أو المدير، ولا يُحذف سجلها من قاعدة البيانات.</p>
      {suspects.map((item) => <article key={item.id}>
        <div><span className={`quality-severity ${item.severity}`}>{item.severity}</span><b>{item.label}</b><small>{item.reason}{item.recommendedAction ? ` · المقترح: ${item.recommendedAction}` : ""}</small></div>
        <div className="quality-item-actions">
          {item.issueDetails && <button type="button" onClick={() => onOpenIssue(item)}>عرض الملاحظة ومعالجتها</button>}
          {item.entityId && editableEntities.includes(item.entity) && <button type="button" onClick={() => onOpenRecord({ entity: item.entity, id: item.entityId! })}>فتح السجل دون تعديل تلقائي</button>}
        </div>
      </article>)}
    </section>
  </section>;
}
