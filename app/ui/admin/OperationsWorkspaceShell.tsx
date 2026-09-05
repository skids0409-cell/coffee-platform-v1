"use client";

import type { ReactNode } from "react";
import { OperationsWorkspaceChrome } from "@/app/ui/admin/governance/OperationsWorkspaceChrome";
import { OperationsCenterArchitecture, operationsWorkspaceDescriptors } from "@/app/ui/admin/governance/OperationsCenterArchitecture";
import { OperationsWorkspaceComposition } from "@/app/ui/admin/governance/OperationsWorkspaceComposition";

export type OperationsWorkspaceId =
  | "dashboard"
  | "records"
  | "entry"
  | "review"
  | "partners"
  | "media"
  | "imports"
  | "search"
  | "requests"
  | "archive"
  | "taxonomy";

export type OperationsWorkspacePanelMap = Partial<Record<OperationsWorkspaceId, ReactNode>>;

type OperationsWorkspaceShellProps = {
  workspace: OperationsWorkspaceId;
  onWorkspaceChange: (workspace: OperationsWorkspaceId) => void;
  panels: OperationsWorkspacePanelMap;
  canManageTaxonomy: boolean;
  operatorLabel: string;
  operatorRoleLabel: string;
  onLogout: () => void | Promise<void>;
};

const navigation: OperationsWorkspaceId[] = [
  "dashboard",
  "records",
  "entry",
  "review",
  "partners",
  "media",
  "imports",
  "search",
  "requests",
  "archive",
  "taxonomy",
];

export function OperationsWorkspaceShell({
  workspace,
  onWorkspaceChange,
  panels,
  canManageTaxonomy,
  operatorLabel,
  operatorRoleLabel,
  onLogout,
}: OperationsWorkspaceShellProps) {
  const visibleNavigation = navigation.filter(
    (value) => value !== "taxonomy" || canManageTaxonomy,
  );
  const activePanel = panels[workspace];

  return (
    <div
      className="operations governed-operations-shell"
      data-workspace-contract="command-master-inspector-v1"
      data-operations-shell="governed-v1"
    >
      <OperationsWorkspaceChrome />
      <div className="operations-status-strip" aria-label="حالة النشر">
        <span className="operations-live-lock">حاجز النشر مفعّل</span>
      </div>

      <section
        className="admin-review-panel governed-operations-surface"
        data-operations-center-root="true"
        data-workspace-composition-contract="command-master-inspector-v1"
        data-governed-visual-contract="operations-center-v2"
      >
        <div className="section-head governed-operations-heading">
          <div>
            <span className="eyebrow">Governed Operations Center</span>
            <h2>مركز البيانات والتشغيل</h2>
            <p>
              المستخدم: {operatorLabel} · الصلاحية: {operatorRoleLabel}
            </p>
          </div>
          <button type="button" onClick={() => void onLogout()}>
            تسجيل الخروج
          </button>
        </div>

        <OperationsCenterArchitecture workspace={workspace} />

        <nav
          className="operations-workspace-nav"
          aria-label="أقسام مركز التشغيل"
          data-architecture-navigation="true"
          data-governed-visual-contract="operations-center-v2"
        >
          {visibleNavigation.map((value) => {
            const descriptor = operationsWorkspaceDescriptors[value];
            return (
              <button
                type="button"
                key={value}
                className={workspace === value ? "active" : ""}
                aria-current={workspace === value ? "page" : undefined}
                aria-description={`${descriptor.group} · ${descriptor.purpose}`}
                data-architecture-group={descriptor.group}
                data-architecture-purpose={descriptor.purpose}
                onClick={() => onWorkspaceChange(value)}
              >
                {descriptor.label}
              </button>
            );
          })}
        </nav>

        <OperationsWorkspaceComposition workspace={workspace} />

        <main className="governed-operations-panel" data-governed-inspector="true">
          {activePanel ?? (
            <section className="directory-state compact" role="status">
              <h3>هذا القسم قيد النقل إلى الهيكل الموحد</h3>
              <p>
                لم تُحذف أي وظيفة. يبقى الانتقال إلى هذا الـShell مغلقاً حتى تكون
                الوحدة التشغيلية المقابلة جاهزة ومغطاة بالاختبارات.
              </p>
            </section>
          )}
        </main>
      </section>
    </div>
  );
}
