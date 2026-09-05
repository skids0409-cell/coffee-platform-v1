"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";

type AuditEvent = {
  id: number;
  event_type: string;
  previous_state: string | null;
  next_state: string;
  actor_user_id: string | null;
  service_actor: string | null;
  created_at: string;
};

type PendingAsset = {
  id: string;
  original_filename: string;
  purpose: string;
  declared_mime: string;
  detected_mime: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  sha256_hex: string | null;
  technical_status: string;
  publication_status: string;
  lifecycle_state: string;
  created_at: string;
  uploaded_by: string;
  uploader: { id: string; display_name: string | null; role: string | null } | null;
  preview_url: string | null;
  technical_report: Record<string, unknown>;
  events: AuditEvent[];
};

type ReviewResponse = {
  authenticated?: boolean;
  role?: string;
  assets?: PendingAsset[];
  traceability_gap_count?: number;
  reason?: string;
};

const entityLabels: Record<string, string> = {
  products: "منتج",
  offers: "عرض",
  organizations: "جهة",
  brands: "علامة تجارية",
  contents: "محتوى",
  origin_claims: "مصدر قهوة",
};

const roleLabels: Record<string, string> = {
  primary: "رئيسية",
  gallery: "معرض",
  logo: "شعار",
  hero: "واجهة",
  evidence: "دليل",
  document: "مستند",
};

const bytes = (value: number | null) => {
  if (value === null) return "—";
  if (value >= 1048576) return `${(value / 1048576).toFixed(2)} MB`;
  return `${Math.max(1, Math.ceil(value / 1024))} KB`;
};

export function PendingAssetReviewConsole() {
  const [assets, setAssets] = useState<PendingAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [role, setRole] = useState("");
  const [traceabilityGaps, setTraceabilityGaps] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [entityType, setEntityType] = useState("products");
  const [entityId, setEntityId] = useState("");
  const [linkRole, setLinkRole] = useState("gallery");
  const [altAr, setAltAr] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/media-vault/review", { cache: "no-store", credentials: "same-origin" });
      const result = (await response.json().catch(() => ({}))) as ReviewResponse;
      if (!response.ok) throw new Error(result.reason || "load_failed");
      const next = Array.isArray(result.assets) ? result.assets : [];
      setAssets(next);
      setRole(result.role || "");
      setTraceabilityGaps(Number(result.traceability_gap_count || 0));
      setSelectedId((current) => (current && next.some((asset) => asset.id === current) ? current : next[0]?.id || ""));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const selected = useMemo(() => assets.find((asset) => asset.id === selectedId) || null, [assets, selectedId]);
  const canReview = ["verifier", "admin"].includes(role);
  const defaultAltAr = selected?.original_filename.replace(/\.[^.]+$/, "") || "";

  const selectAsset = (asset: PendingAsset) => {
    setSelectedId(asset.id);
    setAltAr("");
    setRejectReason("");
    setMessage("");
  };

  const act = async (action: "approve_assign" | "reject_quarantine") => {
    if (!selected) return;
    if (!canReview) {
      setMessage("هذه العملية تتطلب صلاحية مراجع/معتمد أو مدير.");
      return;
    }
    const effectiveAltAr = altAr.trim() || defaultAltAr;
    if (action === "approve_assign") {
      if (!/^[0-9a-f-]{36}$/i.test(entityId.trim())) {
        setMessage("أدخل معرف UUID صحيحاً للسجل المستهدف قبل الاعتماد والإسناد.");
        return;
      }
      if (effectiveAltAr.length < 2) {
        setMessage("الوصف البديل العربي مطلوب قبل الإسناد.");
        return;
      }
    } else if (rejectReason.trim().length < 10) {
      setMessage("اكتب سبب رفض واضحاً من 10 أحرف على الأقل؛ سيحفظ في سجل التدقيق.");
      return;
    }

    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media-vault/review", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: selected.id,
          action,
          payload: action === "approve_assign"
            ? { entity_type: entityType, entity_id: entityId.trim(), role: linkRole, alt_ar: effectiveAltAr }
            : { reason: rejectReason.trim() },
        }),
      });
      const result = await response.json().catch(() => ({})) as { updated?: boolean; reason?: string };
      if (!response.ok) {
        const labels: Record<string, string> = {
          reviewer_required: "هذه العملية تتطلب صلاحية مراجع/معتمد أو مدير.",
          asset_not_pending_review: "الأصل لم يعد ضمن طابور المراجعة؛ حدّث القائمة.",
          technical_evidence_incomplete: "لا يمكن الاعتماد قبل اكتمال SHA-256 وMIME والحجم/الأبعاد المطلوبة.",
          duplicate_requires_review: "توجد نسخة أصلية بنفس SHA-256؛ يجب معالجة التكرار أولاً.",
          invalid_media_target: "السجل المستهدف غير موجود.",
          invalid_assignment: "بيانات الإسناد غير مكتملة أو غير صحيحة.",
          quarantine_reason_required: "سبب الرفض/الحجر مطلوب بوضوح.",
          active_record_links_block_quarantine: "لا يمكن حجر أصل مرتبط بسجل نشط.",
        };
        setMessage(labels[String(result.reason)] || `تعذر تنفيذ القرار: ${String(result.reason || "خطأ غير معروف")}`);
        return;
      }
      setEntityId("");
      setRejectReason("");
      setAltAr("");
      setMessage(action === "approve_assign" ? "تم اعتماد الفحص وإسناد الأصل مع تسجيل القرار." : "تم رفض الأصل ونقله إلى الحجر مع بدء مؤقت 30 يوماً.");
      await load();
    } finally {
      setWorking(false);
    }
  };

  if (state === "loading") return <section className="pending-asset-review-console"><p role="status">جارٍ تحميل الأصول بانتظار الاعتماد وتقارير الفحص…</p></section>;
  if (state === "error") return <section className="pending-asset-review-console"><div className="directory-state compact"><h3>تعذر تحميل طابور تدقيق الأصول</h3><button type="button" onClick={() => void load()}>إعادة المحاولة</button></div></section>;

  return (
    <section className="pending-asset-review-console priority-section" aria-label="الأصول بانتظار الاعتماد وتقارير الفحص" data-governed-master="true">
      <div className="section-head">
        <div>
          <span className="eyebrow">Unified Asset Review</span>
          <h2>الأصول بانتظار الاعتماد وتقارير الفحص</h2>
        </div>
        <div className="queue-title">
          <span>{assets.length} أصل</span>
          <span className={traceabilityGaps === 0 ? "readiness ready" : "readiness blocked"}>مسار التدقيق: {traceabilityGaps === 0 ? "100% مكتمل" : `${traceabilityGaps} فجوة`}</span>
        </div>
      </div>
      <p>هذه شاشة مراجعة تشغيلية موحدة. كل أصل معلّق يملك مسار قرار واضحاً ولا يحتاج المراجع إلى مغادرة قسم المراجعة والاعتماد.</p>

      {!assets.length ? <div className="directory-state compact"><h3>لا توجد أصول عالقة حالياً</h3><p>طابور Pending Technical Audit / Pending Approval فارغ.</p></div> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(300px,.9fr)_minmax(420px,1.4fr)]">
          <div className="space-y-2">
            {assets.map((asset) => (
              <button
                type="button"
                key={asset.id}
                onClick={() => selectAsset(asset)}
                className={`w-full rounded-lg border p-3 text-right ${selectedId === asset.id ? "border-[#6d371e] bg-[#f7f1e8]" : "border-[#dfd4c5] bg-white"}`}
              >
                <b className="block truncate">{asset.original_filename}</b>
                <span className="mt-1 block text-xs text-[#756b63]">{asset.lifecycle_state === "pending_technical_audit" ? "Pending Technical Audit" : "Pending Approval"} · {new Date(asset.created_at).toLocaleString("ar-IQ")}</span>
                <span className="mt-1 block truncate text-xs text-[#756b63]">{asset.sha256_hex ? `${asset.sha256_hex.slice(0, 20)}…` : "SHA-256 غير مكتمل"}</span>
              </button>
            ))}
          </div>

          {selected && (
            <aside className="rounded-xl border border-[#dfd4c5] bg-white p-5" aria-label="Contextual Inspector" data-governed-inspector="true">
              <div className="flex flex-wrap items-start gap-4">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-lg border border-[#dfd4c5] bg-[#f7f1e8]">
                  {selected.preview_url ? <img src={selected.preview_url} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black text-[#6d371e]">Contextual Inspector</span>
                  <h3 className="mt-1 truncate text-xl font-black">{selected.original_filename}</h3>
                  <p className="mt-1 text-xs text-[#756b63]">Asset ID: {selected.id}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div><small>الرافع</small><b className="block">{selected.uploader?.display_name || "مستخدم إداري"}</b><span className="block text-xs text-[#756b63]">{selected.uploader?.role || "staff"} · {selected.uploaded_by}</span></div>
                    <div><small>وقت الرفع</small><b className="block">{new Date(selected.created_at).toLocaleString("ar-IQ")}</b></div>
                    <div><small>الفحص</small><b className="block">{selected.technical_status}</b><span className="block text-xs text-[#756b63]">{selected.detected_mime || selected.declared_mime}</span></div>
                    <div><small>الحجم/الأبعاد</small><b className="block">{bytes(selected.byte_size)}</b><span className="block text-xs text-[#756b63]">{selected.width && selected.height ? `${selected.width}×${selected.height}` : "—"}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3">
                <b>الأثر الإداري</b>
                {selected.events.length ? <ul className="mt-2 space-y-1 text-xs">{selected.events.slice(0, 5).map((event) => <li key={event.id}>{new Date(event.created_at).toLocaleString("ar-IQ")} · {event.event_type} · {event.previous_state || "—"} → {event.next_state}</li>)}</ul> : <p className="mt-2 text-sm text-red-700">لا يوجد سجل تدقيق — هذه فجوة يجب ألا تبقى في الإنتاج.</p>}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <fieldset className="rounded-lg border border-emerald-200 bg-emerald-50 p-4" disabled={working || !canReview}>
                  <legend className="px-2 font-black">Approve & Assign · اعتماد وإسناد</legend>
                  <label className="block text-sm">نوع السجل<select className="mt-1 w-full rounded-md border p-2" value={entityType} onChange={(event) => setEntityType(event.target.value)}>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="mt-2 block text-sm">معرف السجل المستهدف<input className="mt-1 w-full rounded-md border p-2" value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="UUID" /></label>
                  <label className="mt-2 block text-sm">دور الصورة<select className="mt-1 w-full rounded-md border p-2" value={linkRole} onChange={(event) => setLinkRole(event.target.value)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="mt-2 block text-sm">الوصف البديل<input className="mt-1 w-full rounded-md border p-2" value={altAr} onChange={(event) => setAltAr(event.target.value)} placeholder={defaultAltAr} /></label>
                  <button type="button" className="primary mt-3" onClick={() => void act("approve_assign")}>Approve & Assign</button>
                </fieldset>

                <fieldset className="rounded-lg border border-red-200 bg-red-50 p-4" disabled={working || !canReview}>
                  <legend className="px-2 font-black">Reject & Quarantine · رفض وحجر</legend>
                  <label className="block text-sm">سبب القرار<textarea className="mt-1 min-h-24 w-full rounded-md border p-2" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="سبب واضح سيظهر في سجل التدقيق" /></label>
                  <button type="button" className="danger-action mt-3" onClick={() => void act("reject_quarantine")}>Reject & Quarantine</button>
                  <p className="mt-2 text-xs">الحجر يبدأ مؤقت الاحتفاظ النظامي لمدة 30 يوماً، مع بقاء الحذف النهائي منفصلاً وخاضعاً للموافقة.</p>
                </fieldset>
              </div>
              {!canReview && <p className="mt-3 text-sm text-amber-800">حسابك يستطيع مشاهدة الأثر، لكن القرار يتطلب صلاحية مراجع/معتمد أو مدير.</p>}
              {message && <p className="admin-message mt-3" role="status">{message}</p>}
            </aside>
          )}
        </div>
      )}
    </section>
  );
}
