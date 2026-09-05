"use client";

import type { ReactNode } from "react";

export type GovernedWorkspaceKind = "records" | "review" | "entities" | "media";

export function GovernedWorkspaceShell({
  id,
  kind,
  children,
  className = "",
}: {
  id?: string;
  kind: GovernedWorkspaceKind;
  children: ReactNode;
  className?: string;
}) {
  return <section id={id} data-governed-workspace={kind} data-workspace-contract="master-detail-v1" className={`space-y-5 ${className}`.trim()}>{children}</section>;
}

export function GovernedWorkspaceHeader({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#dfd4c5] bg-white p-5">
    <div>
      <span className="text-xs font-black tracking-wide text-[#6d371e]">{eyebrow}</span>
      <h2 className="mt-1 text-2xl font-black">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-[#756b63]">{description}</p>
    </div>
    {status ? <div>{status}</div> : null}
  </div>;
}

export function GovernanceStatusSummary({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "ready" | "blocked";
}) {
  const toneClass = tone === "ready"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : tone === "blocked"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-[#dfd4c5] bg-[#fffaf3] text-[#3a1f12]";
  return <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${toneClass}`}><span>{label}: </span><b>{value}</b></div>;
}

export function MasterDetailWorkspace({
  master,
  inspector,
  inspectorWidth = "340px",
}: {
  master: ReactNode;
  inspector: ReactNode;
  inspectorWidth?: string;
}) {
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_var(--governed-inspector-width)]" style={{ "--governed-inspector-width": inspectorWidth } as React.CSSProperties}>
    <div data-governed-master>{master}</div>
    <div data-governed-detail>{inspector}</div>
  </div>;
}

export function InspectorShell({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <aside className={`rounded-xl border border-[#dfd4c5] bg-white p-4 ${className}`.trim()} aria-label="Contextual Inspector" data-governed-inspector>
    <div className="mb-4"><span className="text-xs font-black text-[#6d371e]">Contextual Inspector</span><h3 className="font-black">{title}</h3>{subtitle ? <div className="mt-1 text-xs text-[#756b63]">{subtitle}</div> : null}</div>
    {children}
  </aside>;
}

export function LifecycleBadge({ label, canonicalPhase }: { label: string; canonicalPhase?: string | null }) {
  return <span className="inline-flex rounded-full bg-[#efe7dc] px-2 py-1 text-xs font-bold text-[#6d371e]" data-lifecycle-phase={canonicalPhase || undefined}>{label}</span>;
}

export function RelationshipPanel({ title = "العلاقات", children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3" data-governed-relationships><b>{title}</b><div className="mt-2">{children}</div></section>;
}

export function AuditTimeline({ title = "سجل التدقيق", children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3" data-governed-audit><b>{title}</b><div className="mt-2">{children}</div></section>;
}

export function TransitionActionPanel({ title = "الإجراءات المحكومة", children }: { title?: string; children: ReactNode }) {
  return <section className="rounded-lg border border-[#dfd4c5] bg-white p-4" data-governed-actions><b>{title}</b><div className="mt-3">{children}</div></section>;
}

export function HoldBanner({ active, children }: { active: boolean; children?: ReactNode }) {
  if (!active) return null;
  return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" role="status" data-legal-hold>{children || "Legal Hold — الإتلاف والتصرف النهائي متوقفان."}</div>;
}

export function RetentionTimer({ daysRemaining, totalDays = 30 }: { daysRemaining: number; totalDays?: number }) {
  const safeDays = Math.max(0, daysRemaining);
  const progress = Math.max(0, Math.min(100, ((totalDays - safeDays) / totalDays) * 100));
  return <div data-retention-timer><b>{safeDays} يوم متبقٍ</b><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee4d8]"><div className="h-full bg-[#6d371e]" style={{ width: `${progress}%` }} /></div><small className="mt-1 block text-[#756b63]">مدة الاحتفاظ: {totalDays} يوماً</small></div>;
}

export function GovernanceEmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-[#dfd4c5] bg-white p-8 text-center" data-governed-empty><h3 className="font-black">{title}</h3><p className="mt-2 text-sm text-[#756b63]">{description}</p></div>;
}

export function GovernedWorkspaceContractBanner({ kind, title }: { kind: GovernedWorkspaceKind; title: string }) {
  return <div className="mb-4 rounded-lg border border-[#dfd4c5] bg-[#fffaf3] p-3 text-xs text-[#756b63]" data-governed-contract-banner={kind}><b className="text-[#3a1f12]">{title}</b><span className="mr-2">Master → Inspector → Relationships → Audit → Governed Actions</span></div>;
}
