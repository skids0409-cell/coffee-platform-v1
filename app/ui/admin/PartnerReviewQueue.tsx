"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from "react";
import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";
import type { PartnerLifecycleAction, PartnerLifecycleProjection } from "@/lib/partner-lifecycle-projection";

type PartnerSubmission = { lifecycle?: PartnerLifecycleProjection; [key: string]: any };

type DecisionRequest = {
  row: PartnerSubmission;
  action: PartnerLifecycleAction;
};

export function PartnerReviewQueue({ focusId = "" }: { focusId?: string }) {
  const [items, setItems] = useState<PartnerSubmission[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [state, setState] = useState("loading");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [decisionRequest, setDecisionRequest] = useState<DecisionRequest | null>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const applyData = (data: any) => {
    setItems(data.submissions || []);
    setMemberships(data.memberships || []);
    setOrganizations(data.organizations || []);
  };

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/partner-submissions", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error("load_failed");
    applyData(data);
    setState("ready");
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { load().catch(() => setState("error")); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (state !== "ready" || !focusId) return;
    const timer = window.setTimeout(() => document.getElementById(`partner-submission-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return () => window.clearTimeout(timer);
  }, [focusId, state]);

  const performDecision = async (id: string, status: string, reviewNote = "") => {
    setWorking(id);
    setMessage("");
    const response = await fetch("/api/admin/partner-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, reviewNote }),
    });
    const data = await response.json();
    setWorking("");
    if (!response.ok) {
      setMessage(`تعذر تنفيذ القرار: ${data.reason || "خطأ غير معروف"}`);
      return false;
    }
    applyData(data);
    setMessage("تم تنفيذ قرار المراجعة وتسجيله في سجل التدقيق.");
    return true;
  };

  const runProjectedAction = (row: PartnerSubmission, action: PartnerLifecycleAction) => {
    if (!action.enabled) return;
    if (action.confirmationMode === "none") {
      void performDecision(row.id, action.targetStatus);
      return;
    }
    setDecisionRequest({ row, action });
  };

  const saveMembership = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setWorking("membership");
    setMessage("");
    const response = await fetch("/api/admin/partner-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "upsert_membership",
        organizationId: form.get("organizationId"),
        userId: form.get("userId"),
        memberRole: form.get("memberRole"),
        status: form.get("status"),
      }),
    });
    const data = await response.json();
    setWorking("");
    if (!response.ok) {
      setMessage(data.reason === "profile_or_organization_missing"
        ? "معرف المستخدم غير موجود في Profiles أو الجهة غير موجودة."
        : "تعذر حفظ العضوية؛ العملية تحتاج صلاحية المدير.");
      return;
    }
    applyData(data);
    setMessage("تم حفظ عضوية الجهة وصلاحيتها.");
  };

  if (state === "loading") return <p role="status">جارٍ تحميل طلبات الجهات…</p>;
  if (state === "error") return <div className="directory-state compact"><p>تعذر تحميل طلبات الجهات.</p><button type="button" onClick={() => { setState("loading"); load().catch(() => setState("error")); }}>إعادة المحاولة</button></div>;

  const decisionTitle = decisionRequest?.action.action === "approve"
    ? "اعتماد طلب الجهة وتحويله"
    : decisionRequest?.action.action === "reject"
      ? "رفض طلب الجهة"
      : "إعادة الطلب إلى الجهة للتعديل";
  const decisionDescription = decisionRequest?.action.action === "approve"
    ? "سينفذ الخادم الكتابة التشغيلية المرتبطة بالطلب ويعتمد submission ضمن معاملة ذرية واحدة."
    : "يجب توثيق ملاحظة واضحة ستظهر للجهة وسيحفظها الخادم مع قرار المراجعة.";

  return <section className="partner-review" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">دخول من بوابة الشركاء</span><h2>طلبات الجهات والبائعين</h2></div><span>{items.length}</span></div>
    <p>الاعتماد ينشئ مسودة تشغيلية أو يطبق تحديث الجهة، ولا يتيح للبائع النشر المباشر.</p>
    {message && <p className="admin-message" role="status">{message}</p>}
    <details className="partner-membership-admin" data-governed-inspector="true">
      <summary>إدارة حسابات الجهات وصلاحياتها ({memberships.length})</summary>
      <form className="partner-submission-form" onSubmit={saveMembership}>
        <label>الجهة<select name="organizationId" required><option value="">اختر الجهة</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name_ar}</option>)}</select></label>
        <label>معرف المستخدم في Supabase Profiles<input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="UUID" /></label>
        <label>الدور<select name="memberRole"><option value="owner">مالك</option><option value="manager">مدير جهة</option><option value="editor">مدخل بيانات</option></select></label>
        <label>الحالة<select name="status"><option value="active">مفعلة</option><option value="suspended">موقوفة</option><option value="revoked">ملغاة</option></select></label>
        <button className="primary wide" disabled={working === "membership"}>حفظ العضوية</button>
      </form>
    </details>
    <div data-governed-master="true">
      {items.map((row) => <article key={row.id} id={`partner-submission-${row.id}`} className={focusId === row.id ? "work-queue-focus" : undefined} data-lifecycle-revision={row.lifecycle?.contractRevision || "missing"}>
        <div><b>{row.organizations?.name_ar || row.organization_id}</b><span>{row.entity_type} · {row.status} · {new Date(row.updated_at).toLocaleString("ar-IQ")}</span><details><summary>معاينة البيانات</summary><pre>{JSON.stringify(row.payload, null, 2)}</pre></details></div>
        <div className="queue-actions">{(row.lifecycle?.availableActions || []).map((action) => <button key={action.action} type="button" disabled={working === row.id || !action.enabled} title={action.blockedReason || ""} data-confirmation-mode={action.confirmationMode} onClick={() => runProjectedAction(row, action)}>{action.label}</button>)}</div>
      </article>)}
      {!items.length && <p>لا توجد طلبات جهات بانتظار المراجعة.</p>}
    </div>
    <StandardConfirmDialog
      open={Boolean(decisionRequest)}
      title={decisionTitle}
      description={decisionDescription}
      confirmLabel={decisionRequest?.action.action === "approve" ? "اعتماد وتحويل" : decisionRequest?.action.action === "reject" ? "رفض الطلب" : "إعادة للتعديل"}
      tone={decisionRequest?.action.action === "reject" ? "danger" : "default"}
      input={decisionRequest && decisionRequest.action.confirmationMode === "reason_required" ? { label: "ملاحظة المراجعة", placeholder: "اكتب ملاحظة واضحة (10 أحرف على الأقل)", minLength: 10, multiline: true } : undefined}
      busy={decisionBusy}
      onCancel={() => { if (!decisionBusy) setDecisionRequest(null); }}
      onConfirm={async (value) => {
        if (!decisionRequest) return;
        setDecisionBusy(true);
        try {
          const updated = await performDecision(decisionRequest.row.id, decisionRequest.action.targetStatus, value);
          if (updated) setDecisionRequest(null);
        } finally {
          setDecisionBusy(false);
        }
      }}
    />
  </section>;
}
