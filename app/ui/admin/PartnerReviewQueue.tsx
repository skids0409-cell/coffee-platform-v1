"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from "react";

export function PartnerReviewQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [state, setState] = useState("loading");
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");

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

  const decide = async (id: string, status: string) => {
    const reviewNote = status === "needs_changes" || status === "rejected"
      ? window.prompt("اكتب الملاحظة التي ستظهر للجهة (10 أحرف على الأقل):") || ""
      : "";
    if ((status === "needs_changes" || status === "rejected") && reviewNote.trim().length < 10) return;
    setWorking(id);
    const response = await fetch("/api/admin/partner-submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, reviewNote }),
    });
    const data = await response.json();
    setWorking("");
    if (!response.ok) {
      window.alert(`تعذر تنفيذ القرار: ${data.reason || "خطأ غير معروف"}`);
      return;
    }
    applyData(data);
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

  return <section className="partner-review" data-workspace-contract="command-master-inspector-v1">
    <div className="section-head"><div><span className="eyebrow">دخول من بوابة الشركاء</span><h2>طلبات الجهات والبائعين</h2></div><span>{items.length}</span></div>
    <p>الاعتماد ينشئ مسودة تشغيلية أو يطبق تحديث الجهة، ولا يتيح للبائع النشر المباشر.</p>
    <details className="partner-membership-admin" data-governed-inspector="true">
      <summary>إدارة حسابات الجهات وصلاحياتها ({memberships.length})</summary>
      <form className="partner-submission-form" onSubmit={saveMembership}>
        <label>الجهة<select name="organizationId" required><option value="">اختر الجهة</option>{organizations.map((org) => <option key={org.id} value={org.id}>{org.name_ar}</option>)}</select></label>
        <label>معرف المستخدم في Supabase Profiles<input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="UUID" /></label>
        <label>الدور<select name="memberRole"><option value="owner">مالك</option><option value="manager">مدير جهة</option><option value="editor">مدخل بيانات</option></select></label>
        <label>الحالة<select name="status"><option value="active">مفعلة</option><option value="suspended">موقوفة</option><option value="revoked">ملغاة</option></select></label>
        <button className="primary wide" disabled={working === "membership"}>حفظ العضوية</button>
        {message && <p className="admin-message wide">{message}</p>}
      </form>
    </details>
    <div data-governed-master="true">
      {items.map((row) => <article key={row.id}>
        <div><b>{row.organizations?.name_ar || row.organization_id}</b><span>{row.entity_type} · {row.status} · {new Date(row.updated_at).toLocaleString("ar-IQ")}</span><details><summary>معاينة البيانات</summary><pre>{JSON.stringify(row.payload, null, 2)}</pre></details></div>
        <div className="queue-actions"><button disabled={working === row.id} onClick={() => decide(row.id, "in_review")}>بدء المراجعة</button><button disabled={working === row.id} onClick={() => decide(row.id, "needs_changes")}>إعادة للتعديل</button><button disabled={working === row.id} onClick={() => decide(row.id, "approved")}>اعتماد وتحويل</button><button disabled={working === row.id} onClick={() => decide(row.id, "rejected")}>رفض</button></div>
      </article>)}
      {!items.length && <p>لا توجد طلبات جهات بانتظار المراجعة.</p>}
    </div>
  </section>;
}
