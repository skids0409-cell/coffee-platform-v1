"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";

type SupportWorkspaceProps = {
  data: { requests: any[]; staff: any[] };
  canDelete: boolean;
  onUpdated: (result: any) => void;
};

export function SupportWorkspace({ data, canDelete, onUpdated }: SupportWorkspaceProps) {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"open" | "closed" | "archived" | "all">("open");
  const filtered = data.requests.filter((request: any) => view === "all" || (view === "archived" ? request.status === "archived" : view === "closed" ? ["resolved", "closed", "spam"].includes(request.status) : !["resolved", "closed", "spam", "archived"].includes(request.status)));
  const selected = filtered.find((request: any) => request.id === selectedId) || filtered[0];

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
        technicalReference: form.get("technicalReference"),
      }),
    });
    const result = await response.json();
    if (!response.ok) { setMessage("تعذر حفظ المعالجة."); return; }
    onUpdated(result);
    setMessage("حُفظت المعالجة وسجل القرار.");
  };

  const workflowAction = async (action: "mark_support_escalated" | "mark_support_reply" | "delete_support_request", openUrl?: string) => {
    if (action === "delete_support_request" && !window.confirm("سيُحذف الطلب المؤرشف نهائياً مع بيانات التواصل. هل أنت متأكد؟")) return;
    setMessage("جارٍ تسجيل العملية…");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id: selected.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.reason === "contact_or_resolution_missing" ? "احفظ نتيجة الحل وتأكد من وجود رقم واتساب أولاً." : "تعذر تنفيذ العملية.");
      return;
    }
    onUpdated(result);
    setMessage(action === "mark_support_escalated" ? "سُجلت إحالة الطلب إلى الدعم الفني." : action === "mark_support_reply" ? "سُجل فتح الرد الموجّه إلى المستخدم." : "حُذف الطلب المؤرشف نهائياً.");
    if (openUrl) window.open(openUrl, "_blank", "noopener,noreferrer");
  };

  const archiveSelected = async () => {
    setMessage("جارٍ نقل الطلب إلى الأرشيف…");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_support_request",
        id: selected.id,
        status: "archived",
        priority: selected.priority || "normal",
        assignedTo: selected.assigned_to,
        internalNotes: selected.internal_notes,
        resolutionNote: selected.resolution_note,
        technicalReference: selected.technical_reference,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage("تعذرت أرشفة الطلب."); return; }
    onUpdated(result);
    setSelectedId("");
    setView("archived");
    setMessage("نُقل الطلب إلى أرشيف طلبات المساعدة.");
  };

  return <section className="support-workspace" id="operations-support" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">Support Desk</span><h2>معالجة طلبات المساعدة</h2></div><span>من الاستلام إلى الإغلاق</span></div>
    <p>هذا مكتب معالجة فعلي داخل المنصة. التقرير الأصلي محفوظ أدناه، وكل تغيير في المسؤول أو الحالة أو الحل يُحفظ في قاعدة البيانات وسجل التدقيق. الربط بأداة فنية خارجية اختياري لاحقاً عبر «المرجع الفني».</p>
    <div className="support-tabs">
      <button type="button" className={view === "open" ? "active" : ""} onClick={() => { setView("open"); setSelectedId(""); }}>المفتوحة</button>
      <button type="button" className={view === "closed" ? "active" : ""} onClick={() => { setView("closed"); setSelectedId(""); }}>المحلولة والمغلقة</button>
      <button type="button" className={view === "archived" ? "active" : ""} onClick={() => { setView("archived"); setSelectedId(""); }}>الأرشيف</button>
      <button type="button" className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setSelectedId(""); }}>الكل</button>
    </div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="support-layout">
      <nav data-governed-master="true">
        {filtered.map((request: any) => <button type="button" className={request.id === selected?.id ? "active" : ""} key={request.id} onClick={() => setSelectedId(request.id)}><b>{request.subject}</b><span>{request.public_reference} · {request.status} · {request.priority}</span></button>)}
        {!filtered.length && <p>لا توجد طلبات في هذا التبويب.</p>}
      </nav>
      {selected && <form key={selected.id} onSubmit={save} data-governed-inspector="true">
        <section className="support-original-report"><h3>التقرير الأصلي المحفوظ</h3><dl><div><dt>المرجع</dt><dd>{selected.public_reference}</dd></div><div><dt>تاريخ الاستلام</dt><dd>{new Date(selected.created_at).toLocaleString("ar-IQ")}</dd></div><div><dt>نوع الطلب</dt><dd>{selected.request_type}</dd></div><div><dt>الصفحة</dt><dd>{selected.page_path}</dd></div><div><dt>قناة التواصل</dt><dd>{selected.preferred_channel}</dd></div><div><dt>المستخدم</dt><dd>{selected.requester_name || "غير مسجل"}</dd></div><div><dt>واتساب</dt><dd>{selected.requester_phone || "غير مسجل"}</dd></div><div><dt>البريد</dt><dd>{selected.requester_email || "غير مسجل"}</dd></div></dl><h4>{selected.subject}</h4><p>{selected.message}</p></section>
        <label>الحالة<select name="status" defaultValue={selected.status}><option value="new">جديد</option><option value="triaged">مصنف</option><option value="in_progress">قيد المعالجة</option><option value="waiting_user">بانتظار المستخدم</option><option value="resolved">تم الحل</option><option value="closed">مغلق</option><option value="spam">مزعج</option><option value="archived">مؤرشف</option></select></label>
        <label>الأولوية<select name="priority" defaultValue={selected.priority || "normal"}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></label>
        <label>المسؤول<select name="assignedTo" defaultValue={selected.assigned_to || ""}><option value="">غير معيّن</option>{data.staff.map((profile: any) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.role}</option>)}</select></label>
        <label>مرجع فني<input name="technicalReference" defaultValue={selected.technical_reference || ""} placeholder="رقم مشكلة أو رابط مهمة فنية" /></label>
        <label className="wide">ملاحظات داخلية<textarea name="internalNotes" rows={5} defaultValue={selected.internal_notes || ""} /></label>
        <label className="wide">نتيجة الحل<textarea name="resolutionNote" rows={4} defaultValue={selected.resolution_note || ""} /></label>
        {selected.history?.length > 0 && <details className="support-history wide"><summary>سجل المعالجة ({selected.history.length})</summary>{selected.history.map((event: any, index: number) => <p key={`${event.created_at}-${index}`}><b>{new Date(event.created_at).toLocaleString("ar-IQ")}</b> · {event.action}</p>)}</details>}
        <button className="primary" type="submit">حفظ المعالجة</button>
        <div className="support-handoff wide"><b>التصنيف والإحالة ثم الرد</b><p>احفظ نوع المشكلة والملاحظات الداخلية أولاً، ثم أحِلها إلى فريق الدعم بالبريد. بعد اكتمال الحل احفظ «نتيجة الحل» وافتح الرد الجاهز إلى المستخدم عبر واتساب.</p><div className="queue-actions"><button type="button" onClick={() => workflowAction("mark_support_escalated", `mailto:?subject=${encodeURIComponent(`إحالة دعم ${selected.public_reference}: ${selected.subject}`)}&body=${encodeURIComponent(`المرجع: ${selected.public_reference}\nالنوع: ${selected.request_type}\nالصفحة: ${selected.page_path}\nالتقرير: ${selected.message}\nالملاحظات الداخلية: ${selected.internal_notes || "—"}\nالمرجع الفني: ${selected.technical_reference || "—"}`)}`)}>إحالة بالبريد إلى فريق الدعم</button><button type="button" disabled={!selected.requester_phone || !selected.resolution_note} onClick={() => workflowAction("mark_support_reply", `https://wa.me/${String(selected.requester_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${selected.requester_name || ""}، تمت معالجة طلبك في منصة قهوتنا.\nالمرجع: ${selected.public_reference}\nالنتيجة: ${selected.resolution_note || ""}`)}`)}>إرسال نتيجة الحل عبر واتساب</button>{["resolved", "closed"].includes(selected.status) && <button type="button" onClick={archiveSelected}>أرشفة بعد الحل</button>}{canDelete && selected.status === "archived" && <button type="button" className="danger-action" onClick={() => workflowAction("delete_support_request")}>مسح الطلب نهائياً</button>}</div><small>{selected.escalated_at ? `آخر إحالة مسجلة: ${new Date(selected.escalated_at).toLocaleString("ar-IQ")}` : "لم تسجل إحالة بعد"} · {selected.customer_replied_at ? `آخر رد مسجل: ${new Date(selected.customer_replied_at).toLocaleString("ar-IQ")}` : "لم يسجل رد للمستخدم بعد"}</small></div>
      </form>}
    </div>
  </section>;
}
