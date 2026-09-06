import { readFileSync, writeFileSync } from "node:fs";

const replaceExact = (path, before, after) => {
  const source = readFileSync(path, "utf8");
  if (!source.includes(before)) throw new Error(`missing marker in ${path}: ${before.slice(0, 80)}`);
  writeFileSync(path, source.replace(before, after));
};

replaceExact(
  "app/api/admin/work-queue/route.ts",
  'deepLink: `/operations?workspace=review&quality=${row.id}`',
  'deepLink: `/operations?workspace=dashboard&quality=${row.id}`',
);

replaceExact(
  "app/ui/admin/OperationsController.tsx",
  '  const [reviewConfirmBusy, setReviewConfirmBusy] = useState(false);',
  '  const [reviewConfirmBusy, setReviewConfirmBusy] = useState(false);\n  const [deepLinkTarget, setDeepLinkTarget] = useState({ quality: "", rights: "", support: "", submission: "" });',
);

replaceExact(
  "app/ui/admin/OperationsController.tsx",
  `  useEffect(() => {\n    const handle = window.setTimeout(() => void loadAdmin().catch(() => setAdminState("error")), 0);\n    return () => window.clearTimeout(handle);\n  }, []);`,
  `  useEffect(() => {\n    const handle = window.setTimeout(() => {\n      const params = new URLSearchParams(window.location.search);\n      const requestedWorkspace = params.get("workspace") as OperationsWorkspaceId | null;\n      const allowedWorkspaces: OperationsWorkspaceId[] = ["dashboard", "records", "entry", "review", "partners", "media", "imports", "search", "requests", "archive", "taxonomy"];\n      if (requestedWorkspace && allowedWorkspaces.includes(requestedWorkspace)) setWorkspace(requestedWorkspace);\n      setDeepLinkTarget({\n        quality: params.get("quality") || "",\n        rights: params.get("rights") || "",\n        support: params.get("support") || "",\n        submission: params.get("submission") || "",\n      });\n      void loadAdmin().catch(() => setAdminState("error"));\n    }, 0);\n    return () => window.clearTimeout(handle);\n  }, []);\n\n  useEffect(() => {\n    if (!adminData || !deepLinkTarget.quality || qualityIssueEditor) return;\n    const handle = window.setTimeout(() => {\n      const issue = adminData.qualityDesk.suspects.find((candidate) => candidate.id === deepLinkTarget.quality && Boolean(candidate.issueDetails));\n      if (issue) setQualityIssueEditor(issue);\n    }, 0);\n    return () => window.clearTimeout(handle);\n  }, [adminData, deepLinkTarget.quality, qualityIssueEditor]);`,
);

replaceExact(
  "app/ui/admin/OperationsController.tsx",
  'review: <ReviewWorkspace queues={adminData.queues} role={adminData.profile.role} workingId={workingId} statusLabels={queueStatusLabels} onOpenRecord={setRecordEditor} onSetStatus={setReviewStatus} onAdminOverride={requestAdminOverride} onProcessRights={processRightsRequest} onDeleteRecord={deleteCatalogRecord} />',
  'review: <ReviewWorkspace queues={adminData.queues} role={adminData.profile.role} workingId={workingId} statusLabels={queueStatusLabels} focusId={deepLinkTarget.rights} onOpenRecord={setRecordEditor} onSetStatus={setReviewStatus} onAdminOverride={requestAdminOverride} onProcessRights={processRightsRequest} onDeleteRecord={deleteCatalogRecord} />',
);
replaceExact(
  "app/ui/admin/OperationsController.tsx",
  'partners: <PartnerReviewQueue />',
  'partners: <PartnerReviewQueue focusId={deepLinkTarget.submission} />',
);
replaceExact(
  "app/ui/admin/OperationsController.tsx",
  'requests: <SupportWorkspace data={adminData.supportWorkspace} canDelete={adminData.profile.role === "admin"} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />',
  'requests: <SupportWorkspace data={adminData.supportWorkspace} canDelete={adminData.profile.role === "admin"} focusId={deepLinkTarget.support} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />',
);

replaceExact(
  "app/ui/admin/ReviewWorkspace.tsx",
  'import { PendingAssetReviewConsole } from "@/app/ui/admin/PendingAssetReviewConsole";',
  'import { useEffect } from "react";\nimport { PendingAssetReviewConsole } from "@/app/ui/admin/PendingAssetReviewConsole";',
);
replaceExact(
  "app/ui/admin/ReviewWorkspace.tsx",
  '  statusLabels: Record<string, string>;\n  onOpenRecord:',
  '  statusLabels: Record<string, string>;\n  focusId?: string;\n  onOpenRecord:',
);
replaceExact(
  "app/ui/admin/ReviewWorkspace.tsx",
  '  statusLabels,\n  onOpenRecord,',
  '  statusLabels,\n  focusId = "",\n  onOpenRecord,',
);
replaceExact(
  "app/ui/admin/ReviewWorkspace.tsx",
  '  const canVerify = ["verifier", "admin"].includes(role);\n\n  return',
  '  const canVerify = ["verifier", "admin"].includes(role);\n\n  useEffect(() => {\n    if (!focusId) return;\n    const handle = window.setTimeout(() => document.getElementById(`review-queue-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);\n    return () => window.clearTimeout(handle);\n  }, [focusId]);\n\n  return',
);
replaceExact(
  "app/ui/admin/ReviewWorkspace.tsx",
  '{queues[key].map((row) => <article key={row.id}>',
  '{queues[key].map((row) => <article key={row.id} id={`review-queue-${row.id}`} className={focusId === row.id ? "work-queue-focus" : undefined}>',
);

replaceExact(
  "app/ui/admin/SupportWorkspace.tsx",
  'import { useState } from "react";',
  'import { useEffect, useState } from "react";',
);
replaceExact(
  "app/ui/admin/SupportWorkspace.tsx",
  '  canDelete: boolean;\n  onUpdated:',
  '  canDelete: boolean;\n  focusId?: string;\n  onUpdated:',
);
replaceExact(
  "app/ui/admin/SupportWorkspace.tsx",
  'export function SupportWorkspace({ data, canDelete, onUpdated }: SupportWorkspaceProps) {\n  const [selectedId, setSelectedId] = useState("");',
  'export function SupportWorkspace({ data, canDelete, focusId = "", onUpdated }: SupportWorkspaceProps) {\n  const [selectedId, setSelectedId] = useState(focusId);',
);
replaceExact(
  "app/ui/admin/SupportWorkspace.tsx",
  '  const selected = filtered.find((request: any) => request.id === selectedId) || filtered[0];\n\n  if (!data.requests.length)',
  '  const selected = filtered.find((request: any) => request.id === selectedId) || filtered[0];\n\n  useEffect(() => {\n    if (!focusId) return;\n    const handle = window.setTimeout(() => { setView("open"); setSelectedId(focusId); }, 0);\n    return () => window.clearTimeout(handle);\n  }, [focusId]);\n\n  if (!data.requests.length)',
);

replaceExact(
  "app/ui/admin/PartnerReviewQueue.tsx",
  'export function PartnerReviewQueue() {',
  'export function PartnerReviewQueue({ focusId = "" }: { focusId?: string }) {',
);
replaceExact(
  "app/ui/admin/PartnerReviewQueue.tsx",
  '  useEffect(() => {\n    const timer = window.setTimeout(() => { load().catch(() => setState("error")); }, 0);\n    return () => window.clearTimeout(timer);\n  }, [load]);',
  '  useEffect(() => {\n    const timer = window.setTimeout(() => { load().catch(() => setState("error")); }, 0);\n    return () => window.clearTimeout(timer);\n  }, [load]);\n\n  useEffect(() => {\n    if (state !== "ready" || !focusId) return;\n    const timer = window.setTimeout(() => document.getElementById(`partner-submission-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);\n    return () => window.clearTimeout(timer);\n  }, [focusId, state]);',
);
replaceExact(
  "app/ui/admin/PartnerReviewQueue.tsx",
  '{items.map((row) => <article key={row.id}>',
  '{items.map((row) => <article key={row.id} id={`partner-submission-${row.id}`} className={focusId === row.id ? "work-queue-focus" : undefined}>',
);

console.log("operational work queue deep-link integration applied");
