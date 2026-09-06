import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

// Taxonomy API: project lifecycle actions for every governed definition.
{
  const path = "app/api/admin/taxonomy/route.ts";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    '} from "@/lib/taxonomy-admin";',
    '} from "@/lib/taxonomy-admin";\nimport { projectTaxonomyLifecycle, type TaxonomyStatus } from "@/lib/taxonomy-lifecycle-projection";',
    "taxonomy projection import");
  s = replaceRequired(s,
    '    categories,\n    fields,',
    '    categories: categories.map((row) => ({ ...row, lifecycle: projectTaxonomyLifecycle(String(row.status) as TaxonomyStatus) })),\n    fields: fields.map((row) => ({ ...row, lifecycle: projectTaxonomyLifecycle(String(row.status) as TaxonomyStatus) })),',
    "taxonomy projected snapshot");
  writeFileSync(path, s);
}

// Taxonomy UI: consume projected actions and StandardConfirmDialog.
{
  const path = "app/ui/admin/TaxonomyWorkspace.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { useCallback, useEffect, useMemo, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useState } from "react";\nimport { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport type { TaxonomyLifecycleAction, TaxonomyLifecycleProjection } from "@/lib/taxonomy-lifecycle-projection";',
    "taxonomy ui imports");
  s = s.replace('phase: string; is_filterable: boolean; status: Status; updated_at: string;', 'phase: string; is_filterable: boolean; status: Status; updated_at: string; lifecycle: TaxonomyLifecycleProjection;');
  s = s.replace('status: Status; updated_at: string;\n};\ntype Filter', 'status: Status; updated_at: string; lifecycle: TaxonomyLifecycleProjection;\n};\ntype Filter');
  s = s.replace('const nextStatuses: Record<Status, Status[]> = { draft: ["in_review"], in_review: ["published", "rejected", "draft"], published: ["archived"], archived: ["draft"], rejected: ["draft"] };\n', '');
  s = replaceRequired(s,
    '  const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);',
    '  const [filterDrafts, setFilterDrafts] = useState<FilterDraft[]>([]);\n  const [transitionRequest, setTransitionRequest] = useState<{ entity: "category" | "field"; row: Category | Field; action: TaxonomyLifecycleAction } | null>(null);\n  const [transitionBusy, setTransitionBusy] = useState(false);',
    "taxonomy dialog state");
  const oldTransition = `  const transition = (entity: "category" | "field", row: Category | Field, status: Status) => {\n    const reason = window.prompt(\`سبب نقل الحالة إلى «\${statusLabels[status]}» (10 أحرف على الأقل):\`) || "";\n    if (reason.trim().length < 10) { setMessage("أُلغي القرار: السبب يجب ألا يقل عن 10 أحرف."); return; }\n    if (status === "published" && !window.confirm("سيصبح تعريف التصنيف فعالاً في واجهات الاكتشاف. هل راجعت الحقول والفلاتر؟")) return;\n    void run(\`transition-\${row.id}\`, "PATCH", { action: "transition_status", entity, id: row.id, status, reason, expectedUpdatedAt: row.updated_at }, "تم تغيير الحالة وتسجيل القرار في سجل التدقيق.");\n  };`;
  const newTransition = `  const requestTransition = (entity: "category" | "field", row: Category | Field, action: TaxonomyLifecycleAction) => {\n    if (!action.enabled) { if (action.blockedReason) setMessage(action.blockedReason); return; }\n    setTransitionRequest({ entity, row, action });\n  };\n  const performTransition = async (value: string) => {\n    if (!transitionRequest) return;\n    const { entity, row, action } = transitionRequest;\n    setTransitionBusy(true);\n    try {\n      await run(\`transition-\${row.id}\`, "PATCH", { action: "transition_status", entity, id: row.id, status: action.targetStatus, reason: value.trim(), expectedUpdatedAt: row.updated_at }, "تم تغيير الحالة وتسجيل القرار في سجل التدقيق.");\n      setTransitionRequest(null);\n    } finally { setTransitionBusy(false); }\n  };`;
  s = replaceRequired(s, oldTransition, newTransition, "taxonomy prompt transition");
  s = s.replace('{selectedCategory && nextStatuses[selectedCategory.status].map((status) => <button type="button" key={status} disabled={!!busy} onClick={() => transition("category", selectedCategory, status)}>نقل إلى {statusLabels[status]}</button>)}', '{selectedCategory && selectedCategory.lifecycle.availableActions.map((action) => <button type="button" key={action.targetStatus} disabled={!!busy || !action.enabled} title={action.blockedReason || undefined} data-lifecycle-revision={selectedCategory.lifecycle.contractRevision} onClick={() => requestTransition("category", selectedCategory, action)}>{action.label}</button>)}');
  s = s.replace('{selectedField && nextStatuses[selectedField.status].map((status) => <button type="button" key={status} disabled={!!busy} onClick={() => transition("field", selectedField, status)}>نقل إلى {statusLabels[status]}</button>)}', '{selectedField && selectedField.lifecycle.availableActions.map((action) => <button type="button" key={action.targetStatus} disabled={!!busy || !action.enabled} title={action.blockedReason || undefined} data-lifecycle-revision={selectedField.lifecycle.contractRevision} onClick={() => requestTransition("field", selectedField, action)}>{action.label}</button>)}');
  s = replaceRequired(s,
    '    </section>\n  </section>;',
    '    </section>\n    <StandardConfirmDialog open={Boolean(transitionRequest)} title={transitionRequest?.action.confirmation.title || ""} description={transitionRequest?.action.confirmation.description || ""} confirmLabel={transitionRequest?.action.confirmation.confirmLabel || "تأكيد"} tone={transitionRequest?.action.confirmation.tone} input={transitionRequest?.action.confirmation.input} busy={transitionBusy} onCancel={() => { if (!transitionBusy) setTransitionRequest(null); }} onConfirm={performTransition} />\n  </section>;',
    "taxonomy dialog render");
  writeFileSync(path, s);
}

// Pending asset review API: return explicit decision capability.
{
  const path = "app/api/admin/media-vault/review/route.ts";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { cleanHttps, mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";',
    'import { cleanHttps, mapMediaError, mediaRpc, mediaStorageRequest } from "@/lib/media-vault";\nimport { projectPendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";',
    "pending capability import");
  s = s.replace('return Response.json({ authenticated: true, role: admin.profile.role, assets: [], traceability_gap_count: 0 }', 'return Response.json({ authenticated: true, role: admin.profile.role, capabilities: projectPendingAssetReviewCapabilities(admin.profile.role), assets: [], traceability_gap_count: 0 }');
  s = replaceRequired(s,
    '      role: admin.profile.role,\n      assets: hydrated,',
    '      role: admin.profile.role,\n      capabilities: projectPendingAssetReviewCapabilities(admin.profile.role),\n      assets: hydrated,',
    "pending capability response");
  writeFileSync(path, s);
}

// Pending asset review UI: consume server capability, never infer from role.
{
  const path = "app/ui/admin/PendingAssetReviewConsole.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { useCallback, useEffect, useMemo, useState } from "react";',
    'import { useCallback, useEffect, useMemo, useState } from "react";\nimport type { PendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";',
    "pending ui import");
  s = replaceRequired(s,
    '  role?: string;\n  assets?: PendingAsset[];',
    '  role?: string;\n  capabilities?: PendingAssetReviewCapabilities;\n  assets?: PendingAsset[];',
    "pending response capability type");
  s = replaceRequired(s,
    '  const [role, setRole] = useState("");',
    '  const [role, setRole] = useState("");\n  const [capabilities, setCapabilities] = useState<PendingAssetReviewCapabilities>({ contractRevision: "pending-asset-review.capabilities.v1", canDecide: false, blockedReason: "صلاحية القرار غير متاحة." });',
    "pending capability state");
  s = replaceRequired(s,
    '      setRole(result.role || "");',
    '      setRole(result.role || "");\n      setCapabilities(result.capabilities || { contractRevision: "pending-asset-review.capabilities.v1", canDecide: false, blockedReason: "تعذر تحميل صلاحية القرار من الخادم." });',
    "pending capability hydrate");
  s = s.replace('  const canReview = ["verifier", "admin"].includes(role);\n', '');
  s = s.replace('    if (!canReview) {\n      setMessage("هذه العملية تتطلب صلاحية مراجع/معتمد أو مدير.");\n      return;\n    }', '    if (!capabilities.canDecide) {\n      setMessage(capabilities.blockedReason || "صلاحية القرار غير متاحة.");\n      return;\n    }');
  s = s.replaceAll('disabled={working || !canReview}', 'disabled={working || !capabilities.canDecide}');
  writeFileSync(path, s);
}

console.log("Remaining final conformance fixes applied");
