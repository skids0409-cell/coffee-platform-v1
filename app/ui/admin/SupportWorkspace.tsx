"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";
import { ContextualEntitySelector, type ResolvedEntityTarget } from "@/app/ui/admin/ContextualEntitySelector";
import type { SupportLifecycleProjection, SupportWorkflowAction } from "@/lib/support-lifecycle-projection";

type SupportRequest = { lifecycle?: SupportLifecycleProjection; [key: string]: any };

type SupportWorkspaceProps = {
  data: { requests: SupportRequest[]; staff: any[] };
  focusId?: string;
  onUpdated: (result: any) => void;
};

export function SupportWorkspace({ data, focusId = "", onUpdated }: SupportWorkspaceProps) {
  const [selectedId, setSelectedId] = useState(focusId);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"open" | "closed" | "archived" | "all">("open");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [technicalTarget, setTechnicalTarget] = useState<ResolvedEntityTarget | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [taskBusy, setTaskBusy] = useState(false);
  const filtered = data.requests.filter((request: SupportRequest) => view === "all" || (view === "archived" ? request.status === "archived" : view === "closed" ? ["resolved", "closed", "spam"].includes(request.status) : !["resolved", "closed", "spam", "archived"].includes(request.status)));
  const selected = filtered.find((request: SupportRequest) => request.id === selectedId) || filtered[0];

  useEffect(() => {
    if (!focusId) return;
    const handle = window.setTimeout(() => { setView("open"); setSelectedId(focusId); }, 0);
    return () => window.clearTimeout(handle);
  }, [focusId]);

  useEffect(() => {
    const task = selected?.technical_task;
    setTechnicalTarget(task?.id ? { entityType: "technical_tasks", id: task.id, label: `${task.task_code} — ${task.title}` } : null);
    setNewTaskTitle("");
  }, [selected?.id, selected?.technical_task?.id]);

  if (!data.requests.length) return <section className="support-workspace" id="operations-support"><h2>معالجة طلبات المساعدة</h2><p>لا توجد طلبات حالياً.</p></section>;

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage("جارٍ حفظ المعالجة…");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_support_request",
        id: selected.id,
        status: form.get("status"),
        priority: form.get("priority"),
        assignedTo: form.get("assignedTo"),
        internalNotes: form.get("internalNotes"),
        resolutionNote: form.get("resolutionNote"),
        technicalTaskId: technicalTarget?.id || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      const labels: Record<string, string> = {
        invalid_support_assignee: "المسؤول المختار غير نشط أو غير مخول.",
        technical_task_not_found: "المهمة التقنية المختارة لم تعد موجودة.",
        closed_technical_task_not_assignable: "لا يمكن إسناد الطلب إلى مهمة تقنية مغلقة.",
      };
      setMessage(labels[String(result.reason)] || "تعذر حفظ المعالجة.");
      return;
    }
    onUpdated(result);
    setMessage("حُفظت المعالجة وسجل القرار.");
  };

  const createTechnicalTask = async () => {
    const title = newTaskTitle.trim();
    if (title.length < 3) { setMessage("اكتب عنواناً واضحاً للمهمة التقنية."); return; }
    setTaskBusy(true);
    setMessage("جارٍ إنشاء المهمة التقنية وربطها بالطلب…");
    try {
      const response = await fetch("/api/admin/technical-tasks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: selected.id, title }),
      });
      const result = await response.json().catch(() => ({})) as { task?: { id?: string; task_code?: string; title?: string }; reason?: string };
      if (!response.ok || !result.task?.id) { setMessage("تعذر إنشاء المهمة التقنية."); return; }
      setTechnicalTarget({ entityType: "technical_tasks", id: result.task.id, label: `${result.task.task_code || "مهمة"} — ${result.task.title || title}` });
      setNewTaskTitle("");
      setMessage("تم إنشاء مهمة تقنية canonical وربطها بالطلب وتسجيل العملية في سجل التدقيق.");
    } finally {
      setTaskBusy(false);
    }
  };

  const workflowAction = async (action: "mark_support_escalated" | "mark_support_reply" | "delete_support_request", openUrl?: string) => {
    setMessage("جارٍ تسجيل العملية…");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id: selected.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.reason === "contact_or_resolution_missing" ? "احفظ نتيجة الحل وتأكد من وجود رقم واتساب أولاً." : "تعذر تنفيذ العملية.");
      return false;
    }
    onUpdated(result);
    setMessage(action === "mark_support_escalated" ? "سُجلت إحالة الطلب إلى الدعم الفني." : action === "mark_support_reply" ? "سُجل فتح الرد الموجّه إلى المستخدم." : "حُذف الطلب المؤرشف نهائياً.");
    if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
    return true;
  };

  const archiveSelected = async (targetStatus: string) => {
    setMessage("جارٍ نقل الطلب إلى الأرشيف…");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_support_request",
        id: selected.id,
        status: targetStatus,
        priority: selected.priority || "normal",
        assignedTo: selected.assigned_to,
        internalNotes: selected.internal_notes,
        resolutionNote: selected.resolution_note,
        technicalTaskId: selected.technical_task_id,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage("تعذرت أرشفة الطلب."); return; }
    onUpdated(result);
    setSelectedId("");
    setView("archived");
    setMessage("نُقل الطلب إلى أرشيف طلبات المساعدة.");
  };

  const runProjectedAction = (action: SupportWorkflowAction) => {
    if (!action.enabled) return;
    if (action.action === "escalate") {
      const taskLabel = technicalTarget?.label || selected.technical_task?.task_code || selected.technical_reference || "غير مرتبط";
      const url = `mailto:?subject=${encodeURIComponent(`إحالة دعم ${selected.public_reference}: ${selected.subject}`)}&body=${encodeURIComponent(`المرجع: ${selected.public_reference}\nالنوع: ${selected.request_type}\nالصفحة: ${selected.page_path}\nالتقرير: ${selected.message}\nالملاحظات الداخلية: ${selected.internal_notes || "—"}\nالمهمة التقنية: ${taskLabel}`)}`;
      void workflowAction("mark_support_escalated", url);
      return;
    }
    if (action.action === "reply") {
      const url = `https://wa.me/${String(selected.requester_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${selected.requester_name || ""}، تمت معالجة طلبك في منصة قهوتنا.\nالمرجع: ${selected.public_reference}\nالنتيجة: ${selected.resolution_note || ""}`)}`;
      void workflowAction("mark_support_reply", url);
      return;
    }
    if (action.action === "archive" && action.targetStatus) {
      void archiveSelected(action.targetStatus);
      return;
    }
    if (action.action === "delete") setConfirmDelete(true);
  };

  return <section className="support-workspace" id="operations-support" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">Support Desk</span><h2>معالجة طلبات المساعدة</h2></div><span>من الاستلام إلى الإغلاق</span></div>
    <p>مكتب المعالجة مرتبط الآن بمهام تقنية canonical وبقائمة المشرفين النشطين من الخادم؛ لا يقبل مرجعاً فنياً نصياً حراً.</p>
    <div className="support-tabs">
      <button type="button" className={view === "open" ? "active" : ""} onClick={() => { setView("open"); setSelectedId(""); }}>المفتوحة</button>
      <button type="button" className={view === "closed" ? "active" : ""} onClick={() => { setView("closed"); setSelectedId(""); }}>المحلولة والمغلقة</button>
      <button type="button" className={view === "archived" ? "active" : ""} onClick={() => { setView("archived"); setSelectedId(""); }}>الأرشيف</button>
      <button type="button" className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setSelectedId(""); }}>الكل</button>
    </div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="support-layout">
      <nav data-governed-master="true">
        {filtered.map((request: SupportRequest) => <button type="button" className={request.id === selected?.id ? "active" : ""} key={request.id} onClick={() => setSelectedId(request.id)}><b>{request.subject}</b><span>{request.public_reference} · {request.status} · {request.priority}</span></button>)}
        {!filtered.length && <p>لا توجد طلبات في هذا التبويب.</p>}
      </nav>
      {selected && <form key={selected.id} onSubmit={save} data-governed-inspector="true" data-lifecycle-revision={selected.lifecycle?.contractRevision || "missing"}>
        <section className="support-original-report"><h3>التقرير الأصلي المحفوظ</h3><dl><div><dt>المرجع</dt><dd>{selected.public_reference}</dd></div><div><dt>تاريخ الاستلام</dt><dd>{new Date(selected.created_at).toLocaleString("ar-IQ")}</dd></div><div><dt>نوع الطلب</dt><dd>{selected.request_type}</dd></div><div><dt>الصفحة</dt><dd>{selected.page_path}</dd></div><div><dt>قناة التواصل</dt><dd>{selected.preferred_channel}</dd></div><div><dt>المستخدم</dt><dd>{selected.requester_name || "غير مسجل"}</dd></div><div><dt>واتساب</dt><dd>{selected.requester_phone || "غير مسجل"}</dd></div><div><dt>البريد</dt><dd>{selected.requester_email || "غير مسجل"}</dd></div></dl><h4>{selected.subject}</h4><p>{selected.message}</p></section>
        <label>الحالة<select name="status" defaultValue={selected.status}>{(selected.lifecycle?.statusOptions || []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>الأولوية<select name="priority" defaultValue={selected.priority || "normal"}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></label>
        <label>المسؤول<select name="assignedTo" defaultValue={selected.assigned_to || ""} data-staff-source="active-server-projection"><option value="">غير معيّن</option>{data.staff.map((profile: any) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.role}</option>)}</select></label>
        <section className="wide rounded-lg border border-[#dfd4c5] p-3" data-support-technical-reference="canonical-task-only">
          <b className="block mb-2">المهمة التقنية</b>
          <ContextualEntitySelector context="support_technical_reference" value={technicalTarget} onChange={setTechnicalTarget} disabled={taskBusy} />
          <div className="mt-2 flex gap-2">
            <input className="min-w-0 flex-1" value={newTaskTitle} onChange={(event) => setNewTaskTitle(event.target.value)} placeholder="عنوان مهمة تقنية جديدة" disabled={taskBusy} />
            <button type="button" onClick={() => void createTechnicalTask()} disabled={taskBusy || newTaskTitle.trim().length < 3}>إنشاء وربط</button>
          </div>
          {selected.technical_reference && !selected.technical_task_id && <small className="mt-2 block text-[#756b63]">مرجع تاريخي غير قابل للتعديل: {selected.technical_reference}</small>}
        </section>
        <label className="wide">ملاحظات داخلية<textarea name="internalNotes" rows={5} defaultValue={selected.internal_notes || ""} /></label>
        <label className="wide">نتيجة الحل<textarea name="resolutionNote" rows={4} defaultValue={selected.resolution_note || ""} /></label>
        {selected.history?.length > 0 && <details className="support-history wide"><summary>سجل المعالجة ({selected.history.length})</summary>{selected.history.map((event: any, index: number) => <p key={`${event.created_at}-${index}`}><b>{new Date(event.created_at).toLocaleString("ar-IQ")}</b> · {event.action}</p>)}</details>}
        <button className="primary" type="submit">حفظ المعالجة</button>
        <div className="support-handoff wide"><b>التصنيف والإحالة ثم الرد</b><p>احفظ نوع المشكلة والملاحظات واربطها بمهمة تقنية canonical، ثم أحِلها إلى فريق الدعم. بعد اكتمال الحل احفظ «نتيجة الحل» وافتح الرد الجاهز إلى المستخدم عبر واتساب.</p><div className="queue-actions">{(selected.lifecycle?.availableActions || []).map((action) => <button key={action.action} type="button" className={action.action === "delete" ? "danger-action" : undefined} disabled={!action.enabled} title={action.blockedReason || ""} data-confirmation-mode={action.confirmationMode} onClick={() => runProjectedAction(action)}>{action.label}</button>)}</div><small>{selected.escalated_at ? `آخر إحالة مسجلة: ${new Date(selected.escalated_at).toLocaleString("ar-IQ")}` : "لم تسجل إحالة بعد"} · {selected.customer_replied_at ? `آخر رد مسجل: ${new Date(selected.customer_replied_at).toLocaleString("ar-IQ")}` : "لم يسجل رد للمستخدم بعد"}</small></div>
      </form>}
    </div>
    <StandardConfirmDialog
      open={confirmDelete}
      title="مسح طلب المساعدة نهائياً"
      description="سيُحذف الطلب المؤرشف نهائياً مع بيانات التواصل المرتبطة به. لا يمكن التراجع عن هذا الإجراء."
      confirmLabel="مسح نهائي"
      tone="danger"
      input={{ label: "اكتب كلمة حذف للتأكيد", requiredValue: "حذف" }}
      busy={deleteBusy}
      onCancel={() => { if (!deleteBusy) setConfirmDelete(false); }}
      onConfirm={async () => {
        setDeleteBusy(true);
        try {
          const deleted = await workflowAction("delete_support_request");
          if (deleted) setConfirmDelete(false);
        } finally {
          setDeleteBusy(false);
        }
      }}
    />
  </section>;
}
