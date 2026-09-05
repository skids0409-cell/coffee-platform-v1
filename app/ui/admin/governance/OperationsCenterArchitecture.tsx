"use client";

import type { OperationsWorkspaceId } from "@/app/ui/admin/OperationsWorkspaceShell";

export type ArchitectureGroup = "operate" | "govern" | "preserve" | "administer";

type WorkspaceDescriptor = {
  label: string;
  group: ArchitectureGroup;
  purpose: string;
};

export const operationsWorkspaceDescriptors: Record<OperationsWorkspaceId, WorkspaceDescriptor> = {
  dashboard: { label: "نظرة عامة", group: "operate", purpose: "Operational command view" },
  records: { label: "إدارة السجلات", group: "govern", purpose: "Governed records & entities" },
  entry: { label: "إضافة سجل", group: "operate", purpose: "Controlled ingestion" },
  review: { label: "المراجعة والاعتماد", group: "govern", purpose: "Review & lifecycle decisions" },
  partners: { label: "طلبات الجهات", group: "operate", purpose: "External intake" },
  media: { label: "الصور والملفات", group: "preserve", purpose: "Media Vault & OAIS preservation" },
  imports: { label: "استيراد الجهات المشاركة", group: "operate", purpose: "Batch intake" },
  search: { label: "قاموس البحث", group: "govern", purpose: "Metadata & discovery governance" },
  requests: { label: "الطلبات والمساعدة", group: "operate", purpose: "Operational requests" },
  archive: { label: "الأرشيف", group: "preserve", purpose: "Retention & disposition" },
  taxonomy: { label: "التصنيفات والفلاتر", group: "administer", purpose: "Controlled vocabularies" },
};

const groupLabels: Record<ArchitectureGroup, { ar: string; en: string }> = {
  operate: { ar: "التشغيل", en: "Operate" },
  govern: { ar: "الحوكمة", en: "Govern" },
  preserve: { ar: "الحفظ", en: "Preserve" },
  administer: { ar: "الإدارة", en: "Administer" },
};

const groups: ArchitectureGroup[] = ["operate", "govern", "preserve", "administer"];

export function OperationsCenterArchitecture({ workspace }: { workspace: OperationsWorkspaceId }) {
  const active = operationsWorkspaceDescriptors[workspace];

  return <>
    <style>{`
      .operations-architecture-rail {
        display:grid; grid-template-columns:minmax(220px,1.35fr) minmax(0,2fr); gap:14px;
        margin:16px 0 8px; padding:16px 18px; border:1px solid #dfd4c5; border-radius:16px;
        background:linear-gradient(135deg,#fffdf9,#f7f1e8); box-shadow:0 10px 30px rgba(58,31,18,.07);
      }
      .operations-architecture-rail__title { display:grid; gap:3px; align-content:center; }
      .operations-architecture-rail__title small { color:#6d371e; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
      .operations-architecture-rail__title b { color:#3a1f12; font-size:18px; }
      .operations-architecture-rail__title span { color:#756b63; font-size:12px; }
      .operations-architecture-rail__groups { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
      .operations-architecture-domain { display:grid; gap:2px; padding:10px 11px; border:1px solid #e7ddd2; border-radius:11px; background:#fff; }
      .operations-architecture-domain strong { color:#3a1f12; font-size:12px; }
      .operations-architecture-domain span { color:#756b63; font-size:10px; }
      .operations-architecture-domain.active { border-color:#6d371e; box-shadow:inset 0 0 0 1px #6d371e; background:#fffaf3; }

      .operations-workspace-nav[data-architecture-navigation="true"] {
        display:grid !important; grid-template-columns:repeat(4,minmax(0,1fr)) !important; gap:8px !important;
        padding:10px !important; border-radius:16px !important; border:1px solid #dfd4c5 !important;
        background:rgba(255,253,249,.97) !important; box-shadow:0 10px 28px rgba(58,31,18,.08) !important;
      }
      .operations-workspace-nav[data-architecture-navigation="true"] button {
        min-height:48px !important; border:1px solid #e8ddd1 !important; border-radius:10px !important;
        background:#fff !important; color:#4d2c1e !important; padding:9px 11px !important; position:relative;
      }
      .operations-workspace-nav[data-architecture-navigation="true"] button::before {
        content:""; position:absolute; inset-inline-start:0; top:8px; bottom:8px; width:3px; border-radius:3px; background:#cbb9a6;
      }
      .operations-workspace-nav[data-architecture-navigation="true"] button[data-architecture-group="govern"]::before { background:#315f78; }
      .operations-workspace-nav[data-architecture-navigation="true"] button[data-architecture-group="preserve"]::before { background:#56745e; }
      .operations-workspace-nav[data-architecture-navigation="true"] button[data-architecture-group="administer"]::before { background:#8a6a46; }
      .operations-workspace-nav[data-architecture-navigation="true"] button:hover { background:#f7f1e8 !important; border-color:#d8c7b4 !important; }
      .operations-workspace-nav[data-architecture-navigation="true"] button.active {
        background:#3a1f12 !important; color:#fffaf3 !important; border-color:#3a1f12 !important; box-shadow:0 6px 16px rgba(58,31,18,.16) !important;
      }
      .operations-workspace-nav[data-architecture-navigation="true"] button.active::before { background:#c89152; }

      #operations-published, #operations-review, #operations-media, .operations-dashboard, .data-center-imports, .taxonomy-workspace { border-radius:16px; overflow:clip; }
      .media-vault-assets, .media-vault-inspector, .published-record-list, .record-editor, .quality-desk, .media-backlog {
        border-radius:12px !important; border-color:#dfd4c5 !important; box-shadow:0 8px 24px rgba(58,31,18,.05);
      }
      .media-vault-inspector, .record-editor { background:#fffdf9 !important; }
      .quality-desk { border-inline-start:4px solid #315f78 !important; }
      .media-backlog { border-inline-start:4px solid #56745e !important; }

      @media (max-width: 980px) {
        .operations-architecture-rail { grid-template-columns:1fr; }
        .operations-workspace-nav[data-architecture-navigation="true"] { grid-template-columns:repeat(3,minmax(0,1fr)) !important; }
      }
      @media (max-width: 700px) {
        .operations-architecture-rail__groups { grid-template-columns:repeat(2,minmax(0,1fr)); }
        .operations-workspace-nav[data-architecture-navigation="true"] { grid-template-columns:repeat(2,minmax(0,1fr)) !important; position:static !important; }
      }
      @media (max-width: 460px) {
        .operations-workspace-nav[data-architecture-navigation="true"] { grid-template-columns:1fr !important; }
      }
    `}</style>
    <section className="operations-architecture-rail" aria-label="Operations architecture context" data-operations-architecture-rail>
      <div className="operations-architecture-rail__title">
        <small>Governed Operations Center</small>
        <b>{active.label}</b>
        <span>DAMA-DMBOK · ISO 15489 · OAIS · master-detail-v1</span>
      </div>
      <div className="operations-architecture-rail__groups">
        {groups.map((group) => <div key={group} className={`operations-architecture-domain ${group === active.group ? "active" : ""}`} data-domain={group}>
          <strong>{groupLabels[group].ar}</strong><span>{groupLabels[group].en}</span>
        </div>)}
      </div>
    </section>
  </>;
}
