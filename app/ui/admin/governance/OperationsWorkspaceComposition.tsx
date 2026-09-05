"use client";

import type { OperationsWorkspaceId } from "@/app/ui/admin/OperationsWorkspaceShell";

type CompositionDescriptor = {
  eyebrow: string;
  title: string;
  description: string;
  flow: string[];
};

const descriptors: Record<OperationsWorkspaceId, CompositionDescriptor> = {
  dashboard: { eyebrow: "Command", title: "لوحة القيادة التشغيلية", description: "قراءة موحدة لحالة مركز البيانات، جودة التشغيل، ومسارات العمل التي تحتاج انتباهاً.", flow: ["Command Summary", "Queues", "Exceptions", "Governed Actions"] },
  records: { eyebrow: "Govern", title: "السجلات والكيانات المحكومة", description: "إدارة السجل الرئيسي ضمن دورة حياة موحدة، مع Inspector وعلاقات وتاريخ قرارات واضح.", flow: ["Master List", "Inspector", "Relationships", "Audit", "Governed Actions"] },
  entry: { eyebrow: "Operate", title: "الإدخال المحكوم", description: "إدخال بيانات جديدة عبر عقود الحقول والتحقق الحالية بدون تجاوز حدود الانتقال الخلفية.", flow: ["Input", "Validation", "Preview", "Submit"] },
  review: { eyebrow: "Govern", title: "المراجعة والقرارات", description: "صفوف مراجعة واضحة تقود إلى Inspector ثم قرار موثق ومقيد بالصلاحيات.", flow: ["Review Queue", "Inspector", "Evidence", "Decision", "Audit"] },
  partners: { eyebrow: "Operate", title: "مدخلات الجهات الخارجية", description: "فصل الطلب الخارجي عن السجل الرئيسي حتى اكتمال التحقق والقبول البشري.", flow: ["Intake", "Triage", "Evidence", "Decision"] },
  media: { eyebrow: "Preserve", title: "Media Vault والحفظ الرقمي", description: "إدارة الأصل الرقمي، علاقاته، Fixity، AIP/DIP، الاحتفاظ والتصرف ضمن واجهة واحدة.", flow: ["Asset Master", "Inspector", "Relationships", "Preservation", "Disposition"] },
  imports: { eyebrow: "Operate", title: "الإدخال الدفعي", description: "استقبال الدفعات، التحقق من الصفوف، عزل الاستثناءات ثم ترقية البيانات القابلة للاعتماد.", flow: ["Batch Intake", "Validation", "Exceptions", "Import"] },
  search: { eyebrow: "Govern", title: "حوكمة البحث والاكتشاف", description: "إدارة مفردات البحث والإشارات التصحيحية كبيانات محكومة لا كقواعد مخفية داخل الواجهة.", flow: ["Terms", "Signals", "Review", "Apply"] },
  requests: { eyebrow: "Operate", title: "مكتب الطلبات التشغيلية", description: "فرز الطلبات والمساعدة إلى حالات قابلة للتتبع ثم إغلاقها بقرار موثق.", flow: ["Queue", "Context", "Action", "Resolution"] },
  archive: { eyebrow: "Preserve", title: "الاحتفاظ والتصرف", description: "عرض السجلات المحتفظ بها وحالات المنع/الاحتفاظ قبل أي تصرف نهائي.", flow: ["Retained", "Hold Check", "Disposition Review", "Audit"] },
  taxonomy: { eyebrow: "Administer", title: "المفردات والتصنيفات المحكومة", description: "إدارة taxonomy وcontrolled vocabularies مع فصل صلاحيات الإدارة عن الاستخدام التشغيلي.", flow: ["Vocabulary", "Definition", "Governed Change", "Published Use"] },
};

export function OperationsWorkspaceComposition({ workspace }: { workspace: OperationsWorkspaceId }) {
  const active = descriptors[workspace];

  return <>
    <style>{`
      .governed-operations-surface { --operations-center-root:true; }
      .ops-composition { display:grid; grid-template-columns:minmax(240px,1.25fr) minmax(0,2fr); gap:14px; margin:0 0 16px; padding:15px 17px; border:1px solid #e5d9cc; border-radius:14px; background:#fff; box-shadow:0 7px 22px rgba(58,31,18,.045); }
      .ops-composition__copy { display:grid; gap:4px; align-content:center; }
      .ops-composition__copy small { color:#8a6a46; font-size:10px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; }
      .ops-composition__copy strong { color:#3a1f12; font-size:17px; }
      .ops-composition__copy p { margin:0; color:#756b63; font-size:12px; line-height:1.75; }
      .ops-composition__flow { display:flex; align-items:center; gap:6px; overflow:auto; padding:3px 1px; }
      .ops-composition__step { flex:1 0 112px; min-height:52px; display:grid; place-content:center; padding:8px 10px; border:1px solid #e8ddd1; border-radius:10px; background:#fffaf3; color:#4d2c1e; font-size:10px; font-weight:900; text-align:center; position:relative; }
      .ops-composition__step:not(:last-child)::after { content:"‹"; position:absolute; inset-inline-end:-7px; top:50%; transform:translateY(-50%); color:#b69d85; background:#fff; padding:0 2px; z-index:2; }

      [data-operations-center-root="true"] .section,
      [data-operations-center-root="true"] .operations-dashboard,
      [data-operations-center-root="true"] .data-center-imports,
      [data-operations-center-root="true"] .quality-desk,
      [data-operations-center-root="true"] .media-backlog { border-color:#e3d7ca; }
      [data-operations-center-root="true"] .section-head { align-items:flex-start; gap:12px; }
      [data-operations-center-root="true"] .section-head h2,
      [data-operations-center-root="true"] .section h2 { color:#3a1f12; letter-spacing:-.015em; }
      [data-operations-center-root="true"] .operations-grid article { border-radius:12px; border-color:#e3d7ca; box-shadow:none; }
      [data-operations-center-root="true"] table { border-collapse:separate; border-spacing:0; width:100%; overflow:hidden; border:1px solid #e5d9cc; border-radius:11px; background:#fff; }
      [data-operations-center-root="true"] th { background:#f7f1e8; color:#4d2c1e; font-size:11px; font-weight:900; }
      [data-operations-center-root="true"] th,
      [data-operations-center-root="true"] td { border-bottom:1px solid #eee4d8; padding:10px 11px; }
      [data-operations-center-root="true"] tr:last-child td { border-bottom:0; }
      [data-operations-center-root="true"] input,
      [data-operations-center-root="true"] select,
      [data-operations-center-root="true"] textarea { border-color:#dcd0c2; border-radius:9px; background:#fff; }
      [data-operations-center-root="true"] input:focus,
      [data-operations-center-root="true"] select:focus,
      [data-operations-center-root="true"] textarea:focus { outline:3px solid rgba(200,145,82,.2); outline-offset:1px; border-color:#c89152; }
      [data-operations-center-root="true"] .queue-actions { padding-top:8px; border-top:1px solid #eee4d8; }
      [data-operations-center-root="true"] .admin-message { border-radius:10px; }

      @media (max-width: 820px) { .ops-composition { grid-template-columns:1fr; } }
      @media (max-width: 520px) { .ops-composition { padding:12px; } .ops-composition__flow { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); overflow:visible; } .ops-composition__step { min-width:0; } .ops-composition__step::after { display:none; } }
    `}</style>
    <section className="ops-composition" aria-label="Workspace operating model" data-workspace-composition="command-master-inspector-v1">
      <div className="ops-composition__copy"><small>{active.eyebrow}</small><strong>{active.title}</strong><p>{active.description}</p></div>
      <div className="ops-composition__flow" aria-label="Operational path">
        {active.flow.map((step) => <span className="ops-composition__step" key={step}>{step}</span>)}
      </div>
    </section>
  </>;
}
