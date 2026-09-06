import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

{
  const path = "app/ui/admin/useReviewRecordEditorController.ts";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'type ControllerProps = {\n  entity: string;\n  id: string;\n  onSaved: () => Promise<void>;\n  onClose: () => void;\n};',
    'export type RecordEditorConfirmationRequest = { title: string; description: string; confirmLabel: string; tone?: "default" | "danger" };\n\ntype ControllerProps = {\n  entity: string;\n  id: string;\n  onSaved: () => Promise<void>;\n  onClose: () => void;\n  requestConfirmation: (request: RecordEditorConfirmationRequest) => Promise<boolean>;\n};',
    "controller confirmation prop");
  s = replaceRequired(s,
    'export function useReviewRecordEditorController({ entity, id, onSaved, onClose }: ControllerProps) {',
    'export function useReviewRecordEditorController({ entity, id, onSaved, onClose, requestConfirmation }: ControllerProps) {',
    "controller destructure confirmation");
  s = replaceRequired(s,
    '    if (data?.record?.status === "published" && !window.confirm("هذا السجل منشور حالياً، وأي تعديل سيظهر مباشرةً للمستخدمين بعد الحفظ. هل تريد المتابعة؟")) return;',
    '    if (data?.record?.status === "published" && !(await requestConfirmation({ title: "تأكيد تعديل سجل منشور", description: "هذا السجل منشور حالياً، وأي تعديل سيظهر مباشرةً للمستخدمين بعد الحفظ.", confirmLabel: "حفظ التعديل" }))) return;',
    "published save confirm");
  s = replaceRequired(s,
    '    if (!window.confirm("سيُفصل ارتباط الصورة بهذا السجل فقط. لن يُحذف ملف الأصل من Media Vault. هل تريد المتابعة؟")) return;',
    '    if (!(await requestConfirmation({ title: "فصل الصورة عن السجل", description: "سيُفصل ارتباط الصورة بهذا السجل فقط. لن يُحذف ملف الأصل من Media Vault.", confirmLabel: "فصل الصورة", tone: "danger" }))) return;',
    "unlink media confirm");
  s = replaceRequired(s,
    '    if (!window.confirm("سيُعاد محتوى الحقول الأساسية إلى النسخة السابقة، مع الاحتفاظ بسجل كامل للعملية. العلاقات والصور لا تُحذف. هل تريد المتابعة؟")) return;',
    '    if (!(await requestConfirmation({ title: "استعادة نسخة سابقة", description: "سيُعاد محتوى الحقول الأساسية إلى النسخة السابقة، مع الاحتفاظ بسجل كامل للعملية. العلاقات والصور لا تُحذف.", confirmLabel: "استعادة النسخة", tone: "danger" }))) return;',
    "restore revision confirm");
  writeFileSync(path, s);
}

{
  const path = "app/ui/admin/ReviewRecordEditor.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { RecordForm } from "@/app/ui/admin/RecordForm";\nimport { useReviewRecordEditorController } from "@/app/ui/admin/useReviewRecordEditorController";',
    'import { useState } from "react";\nimport { RecordForm } from "@/app/ui/admin/RecordForm";\nimport { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport { useReviewRecordEditorController, type RecordEditorConfirmationRequest } from "@/app/ui/admin/useReviewRecordEditorController";',
    "editor confirmation imports");
  s = replaceRequired(s,
    'export function ReviewRecordEditor({ entity, id, canRestore, onClose, onSaved }: ReviewRecordEditorProps) {\n  const controller = useReviewRecordEditorController({ entity, id, onSaved, onClose });',
    'export function ReviewRecordEditor({ entity, id, canRestore, onClose, onSaved }: ReviewRecordEditorProps) {\n  const [confirmation, setConfirmation] = useState<(RecordEditorConfirmationRequest & { resolve: (value: boolean) => void }) | null>(null);\n  const requestConfirmation = (request: RecordEditorConfirmationRequest) => new Promise<boolean>((resolve) => setConfirmation({ ...request, resolve }));\n  const controller = useReviewRecordEditorController({ entity, id, onSaved, onClose, requestConfirmation });',
    "editor confirmation state");
  const marker = '    </section>\n  </div>;';
  const replacement = '    </section>\n    <StandardConfirmDialog open={Boolean(confirmation)} title={confirmation?.title || ""} description={confirmation?.description || ""} confirmLabel={confirmation?.confirmLabel || "تأكيد"} tone={confirmation?.tone} onCancel={() => { confirmation?.resolve(false); setConfirmation(null); }} onConfirm={() => { confirmation?.resolve(true); setConfirmation(null); }} />\n  </div>;';
  s = replaceRequired(s, marker, replacement, "editor confirmation dialog");
  writeFileSync(path, s);
}

console.log("Record editor browser confirmations replaced with governed dialog");
