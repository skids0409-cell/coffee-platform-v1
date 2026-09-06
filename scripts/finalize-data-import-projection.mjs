import { readFileSync, writeFileSync } from "node:fs";

function replaceOrThrow(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`${label} marker missing`);
  return source.replace(before, after);
}

{
  const path = "app/ui/admin/DataCenterWorkspace.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceOrThrow(s,
    'import { useEffect, useState, type ReactNode } from "react";',
    'import { useEffect, useState, type ReactNode } from "react";\nimport { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport type { DataImportLifecycleAction, DataImportLifecycleProjection } from "@/lib/data-import-lifecycle-projection";',
    "workspace imports");
  s = replaceOrThrow(s,
    '  imported_at: string | null;\n};',
    '  imported_at: string | null;\n  lifecycle?: DataImportLifecycleProjection;\n};',
    "workspace batch lifecycle");
  s = replaceOrThrow(s,
    '  const [reference, setReference] = useState<DataCenterReference>(emptyReference());',
    '  const [reference, setReference] = useState<DataCenterReference>(emptyReference());\n  const [lifecycleRequest, setLifecycleRequest] = useState<{ batch: DataCenterBatch; action: DataImportLifecycleAction } | null>(null);\n  const [lifecycleBusy, setLifecycleBusy] = useState(false);',
    "workspace state");

  const start = s.indexOf('  const importBatch = async (batchId: string) => {');
  const end = s.indexOf('  const visibleBatches = batches.filter', start);
  if (start < 0 || end < 0) throw new Error("workspace lifecycle functions markers missing");
  const replacement = `  const openBatch = async (batchId: string) => {\n    setWorking(\`details-\${batchId}\`);\n    const response = await fetch(\`/api/admin/data-center?batchId=\${encodeURIComponent(batchId)}\`, { cache: "no-store", credentials: "same-origin" });\n    const data = await response.json();\n    setWorking("");\n    if (!response.ok) { setMessage("تعذر فتح تفاصيل الدفعة."); return; }\n    setBatchDetails(data);\n  };\n\n  const performLifecycleAction = async (batch: DataCenterBatch, action: DataImportLifecycleAction) => {\n    setWorking(\`lifecycle-\${batch.id}\`);\n    setMessage("");\n    const response = await fetch("/api/admin/data-center", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: action.apiAction, batchId: batch.id }) });\n    const data = await response.json();\n    setWorking("");\n    if (!response.ok) { setMessage(responseMessage(data.reason)); return false; }\n    setBatches(data.batches || []);\n    setBatchDetails(null);\n    if (action.action === "import") {\n      setMessage(\`تم إنشاء \${Number(data.imported?.imported || 0).toLocaleString("ar-IQ")} مسودة. راجعها في طابور الجهات.\`);\n      await onChanged();\n    } else if (action.action === "archive") {\n      setMessage("نُقلت الدفعة إلى قسم الأرشيف الرئيسي.");\n    }\n    return true;\n  };\n\n  const requestLifecycleAction = (batch: DataCenterBatch, action: DataImportLifecycleAction) => {\n    if (!action.enabled) return;\n    setLifecycleRequest({ batch, action });\n  };\n\n`;
  s = s.slice(0, start) + replacement + s.slice(end);

  const oldActions = '<div className="queue-actions"><span className={`batch-status ${batch.status}`}>{batchStatusLabel(batch.status)}</span><button type="button" disabled={working === `details-${batch.id}`} onClick={() => openBatch(batch.id)}>عرض التفاصيل</button>{batch.status === "ready" && <button type="button" disabled={working === batch.id} onClick={() => importBatch(batch.id)}>{working === batch.id ? "جارٍ التحويل…" : "تحويل إلى مسودات"}</button>}{["imported", "rejected"].includes(batch.status) && <button type="button" disabled={working === `archive-${batch.id}`} onClick={() => changeBatchArchive(batch)}>حفظ في الأرشيف</button>}</div>';
  const newActions = '<div className="queue-actions"><span className={`batch-status ${batch.status}`}>{batchStatusLabel(batch.status)}</span><button type="button" disabled={working === `details-${batch.id}`} onClick={() => openBatch(batch.id)}>عرض التفاصيل</button>{(batch.lifecycle?.availableActions || []).filter((action) => action.action === "import" || action.action === "archive").map((action) => <button key={action.action} type="button" disabled={working === `lifecycle-${batch.id}` || !action.enabled} title={action.blockedReason || ""} data-confirmation-mode={action.confirmationMode} onClick={() => requestLifecycleAction(batch, action)}>{action.label}</button>)}</div>';
  s = replaceOrThrow(s, oldActions, newActions, "workspace projected actions");
  s = replaceOrThrow(s,
    '    {batchDetails && <div className="batch-details"',
    '    <StandardConfirmDialog open={Boolean(lifecycleRequest)} title={lifecycleRequest?.action.action === "import" ? "تحويل الدفعة إلى مسودات" : "أرشفة الدفعة"} description={lifecycleRequest?.action.action === "import" ? "سينفذ الخادم التحويل الذري للسجلات الصالحة إلى مسودات فقط، دون نشر عام." : "ستنقل الدفعة المكتملة إلى الأرشيف ويمكن استعادتها لاحقاً."} confirmLabel={lifecycleRequest?.action.label || "تأكيد"} busy={lifecycleBusy} onCancel={() => { if (!lifecycleBusy) setLifecycleRequest(null); }} onConfirm={async () => { if (!lifecycleRequest) return; setLifecycleBusy(true); try { const ok = await performLifecycleAction(lifecycleRequest.batch, lifecycleRequest.action); if (ok) setLifecycleRequest(null); } finally { setLifecycleBusy(false); } }} />\n    {batchDetails && <div className="batch-details"',
    "workspace confirm dialog");
  if (/window\.(confirm|prompt|alert)\s*\(/.test(s)) throw new Error("browser dialogs remain in DataCenterWorkspace");
  writeFileSync(path, s);
}

{
  const path = "app/ui/admin/ArchivedImportBatches.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceOrThrow(s,
    'import { useEffect, useState } from "react";',
    'import { useEffect, useState } from "react";\nimport { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport type { DataImportLifecycleAction, DataImportLifecycleProjection } from "@/lib/data-import-lifecycle-projection";',
    "archive imports");
  s = replaceOrThrow(s,
    '  created_at: string;\n};',
    '  created_at: string;\n  lifecycle?: DataImportLifecycleProjection;\n};',
    "archive batch lifecycle");
  s = replaceOrThrow(s,
    '  const [working, setWorking] = useState("");',
    '  const [working, setWorking] = useState("");\n  const [lifecycleRequest, setLifecycleRequest] = useState<{ batch: DataCenterBatch; action: DataImportLifecycleAction } | null>(null);\n  const [lifecycleBusy, setLifecycleBusy] = useState(false);',
    "archive state");

  const start = s.indexOf('  const act = async (batch: DataCenterBatch, action: "restore_batch" | "delete_archived_batch") => {');
  const end = s.indexOf('\n\n  return <section', start);
  if (start < 0 || end < 0) throw new Error("archive act markers missing");
  const replacement = `  const performLifecycleAction = async (batch: DataCenterBatch, action: DataImportLifecycleAction) => {\n    setWorking(batch.id);\n    setMessage("");\n    const response = await fetch("/api/admin/data-center", {\n      method: "POST",\n      headers: { "content-type": "application/json" },\n      body: JSON.stringify({ action: action.apiAction, batchId: batch.id }),\n    });\n    const result = await response.json().catch(() => ({}));\n    setWorking("");\n    if (!response.ok) { setMessage(result.reason === "admin_required" ? "المسح النهائي يتطلب صلاحية المدير." : "تعذر تنفيذ العملية على الدفعة."); return false; }\n    setMessage(action.action === "restore" ? "أعيدت الدفعة إلى سجل الدفعات النشطة." : \`حُذفت الدفعة و\${Number(result.deletedRows || 0).toLocaleString("ar-IQ")} من صفوفها الخام.\`);\n    await load();\n    return true;\n  };\n\n  const requestLifecycleAction = (batch: DataCenterBatch, action: DataImportLifecycleAction) => {\n    if (!action.enabled) return;\n    setLifecycleRequest({ batch, action });\n  };`;
  s = s.slice(0, start) + replacement + s.slice(end);

  const oldButtons = '<div className="queue-actions"><button type="button" disabled={working === batch.id} onClick={() => act(batch, "restore_batch")}>استعادة إلى سجل الدفعات</button><button type="button" className="danger-action" disabled={working === batch.id} onClick={() => act(batch, "delete_archived_batch")}>مسح نهائي</button></div>';
  const newButtons = '<div className="queue-actions">{(batch.lifecycle?.availableActions || []).filter((action) => action.action === "restore" || action.action === "delete").map((action) => <button key={action.action} type="button" className={action.action === "delete" ? "danger-action" : undefined} disabled={working === batch.id || !action.enabled} title={action.blockedReason || ""} data-confirmation-mode={action.confirmationMode} onClick={() => requestLifecycleAction(batch, action)}>{action.label}</button>)}</div>';
  s = replaceOrThrow(s, oldButtons, newButtons, "archive projected buttons");
  s = replaceOrThrow(s,
    '    </div>\n  </section>;',
    '    </div>\n    <StandardConfirmDialog open={Boolean(lifecycleRequest)} title={lifecycleRequest?.action.action === "delete" ? "مسح نهائي لدفعة الاستيراد" : "استعادة دفعة الاستيراد"} description={lifecycleRequest?.action.action === "delete" ? lifecycleRequest.batch.lifecycle?.retention.note || "سيُحذف سجل الدفعة وصفوف intake الخام فقط." : "ستعود الدفعة إلى سجل الدفعات النشطة وفق حالتها السابقة."} confirmLabel={lifecycleRequest?.action.label || "تأكيد"} tone={lifecycleRequest?.action.action === "delete" ? "danger" : "default"} input={lifecycleRequest?.action.confirmationMode === "typed" ? { label: "رمز الدفعة", placeholder: lifecycleRequest.batch.batch_code, requiredValue: lifecycleRequest.batch.batch_code } : undefined} busy={lifecycleBusy} onCancel={() => { if (!lifecycleBusy) setLifecycleRequest(null); }} onConfirm={async () => { if (!lifecycleRequest) return; setLifecycleBusy(true); try { const ok = await performLifecycleAction(lifecycleRequest.batch, lifecycleRequest.action); if (ok) setLifecycleRequest(null); } finally { setLifecycleBusy(false); } }} />\n  </section>;',
    "archive confirm dialog");
  if (/window\.(confirm|prompt|alert)\s*\(/.test(s)) throw new Error("browser dialogs remain in ArchivedImportBatches");
  writeFileSync(path, s);
}

console.log("Data Import UI now consumes server lifecycle projections and standard dialogs");
