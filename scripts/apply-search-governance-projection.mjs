import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

const routePath = "app/api/admin/review/route.ts";
let route = readFileSync(routePath, "utf8");
route = replaceRequired(
  route,
  'import { projectSupportLifecycle } from "@/lib/support-lifecycle-projection";',
  'import { projectSupportLifecycle } from "@/lib/support-lifecycle-projection";\nimport { projectSearchTermLifecycle } from "@/lib/search-term-lifecycle-projection";',
  "review route projection import",
);
route = replaceRequired(
  route,
  '    searchGovernance: {\n      terms: searchTerms,',
  '    searchGovernance: {\n      terms: searchTerms.map((term) => ({ ...term, lifecycle: projectSearchTermLifecycle({ status: term.status, role }) })),',
  "review route Search term projection",
);
writeFileSync(routePath, route);

const controllerPath = "app/ui/admin/OperationsController.tsx";
let controller = readFileSync(controllerPath, "utf8");
controller = replaceRequired(
  controller,
  'import type { SearchEntityType, SearchIntent } from "@/lib/search-governance";',
  'import type { SearchEntityType, SearchIntent } from "@/lib/search-governance";\nimport type { SearchTermLifecycleAction, SearchTermLifecycleProjection } from "@/lib/search-term-lifecycle-projection";',
  "controller projection import",
);
controller = replaceRequired(
  controller,
  '  updated_at: string;\n};\n\ntype QualitySuspect =',
  '  updated_at: string;\n  lifecycle: SearchTermLifecycleProjection;\n};\n\ntype QualitySuspect =',
  "controller Search term lifecycle type",
);
const oldHandlers = `  const setSearchTermStatus = async (id: string, next: "draft" | "active" | "retired") => {\n    if (next === "active" && !window.confirm("سيؤثر هذا المصطلح فوراً في فهم البحث وترتيب النتائج. هل راجعت معناه والمرادفات؟")) return;\n    setWorkingId(id);\n    setAdminMessage("");\n    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_search_term_status", id, status: next }) });\n    const data = await response.json();\n    setWorkingId("");\n    if (!response.ok) { setAdminMessage("تعذر تغيير حالة المصطلح. أعد تسجيل الدخول ثم حاول مجدداً."); return; }\n    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);\n    setAdminMessage("تم تحديث قاعدة البحث وتسجيل القرار.");\n  };\n\n  const deleteSearchTerm = async (id: string) => {\n    if (!window.confirm("سيُحذف هذا المصطلح غير الفعال نهائياً من القاموس. هل تريد المتابعة؟")) return;\n    setWorkingId(id);\n    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_search_term", id }) });\n    const data = await response.json();\n    setWorkingId("");\n    if (!response.ok) { setAdminMessage(data.reason === "active_term_cannot_be_deleted" ? "أوقف المصطلح الفعال أولاً ثم احذفه." : "تعذر حذف المصطلح."); return; }\n    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);\n    setAdminMessage("حُذف المصطلح غير الفعال وسُجلت العملية.");\n  };`;
const newHandlers = `  const performSearchTermAction = async (term: SearchTerm, action: SearchTermLifecycleAction) => {\n    setWorkingId(term.id);\n    setAdminMessage("");\n    const payload = action.apiAction === "set_search_term_status"\n      ? { action: action.apiAction, id: term.id, status: action.nextStatus }\n      : { action: action.apiAction, id: term.id };\n    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });\n    const data = await response.json();\n    setWorkingId("");\n    if (!response.ok) { setAdminMessage(action.blockedReason || "تعذر تنفيذ إجراء مصطلح البحث. أعد تحميل البيانات ثم حاول مجدداً."); return; }\n    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);\n    setAdminMessage("تم تنفيذ إجراء مصطلح البحث وتسجيل القرار.");\n  };\n\n  const requestSearchTermAction = (term: SearchTerm, action: SearchTermLifecycleAction) => {\n    if (!action.enabled) return;\n    const execute = () => performSearchTermAction(term, action);\n    if (!action.confirmation.required) { void execute(); return; }\n    setReviewConfirm({\n      title: action.confirmation.title,\n      description: action.confirmation.description,\n      confirmLabel: action.confirmation.confirmLabel,\n      tone: action.confirmation.tone,\n      execute,\n    });\n  };`;
controller = replaceRequired(controller, oldHandlers, newHandlers, "controller Search lifecycle handlers");
controller = replaceRequired(
  controller,
  'onStatusChange={setSearchTermStatus} onDelete={deleteSearchTerm}',
  'onLifecycleAction={requestSearchTermAction}',
  "controller Search workspace lifecycle wiring",
);
writeFileSync(controllerPath, controller);

console.log("Search Governance lifecycle projection cutover applied");
