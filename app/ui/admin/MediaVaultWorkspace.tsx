"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaPreservationInspectorPanel, MediaPreservationStatusStrip } from "@/app/ui/admin/governance/MediaPreservationProjection";

type VaultLink = {
  id: string;
  entity_type: string;
  entity_id: string;
  target_label?: string;
  role: string;
  is_primary: boolean;
  alt_ar: string;
  caption_ar: string | null;
  link_status: string;
  linked_at: string;
};

type PurgeRequest = {
  id: string;
  reason: string;
  status: string;
  requested_at: string;
  review_note: string | null;
};

type VaultAsset = {
  id: string;
  purpose: string;
  original_filename: string;
  declared_mime: string;
  detected_mime: string | null;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  sha256_hex: string | null;
  technical_status: string;
  publication_status: string;
  legal_hold: boolean;
  quarantine_started_at: string | null;
  retention_expires_at: string | null;
  retention_days_remaining: number | null;
  lifecycle_state: string;
  purge_request_status: string | null;
  preview_url: string | null;
  links: VaultLink[];
  rights?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  purge_requests: PurgeRequest[];
};

type LoadResult = { assets?: VaultAsset[]; role?: string; reason?: string };
type QueueKey = "all" | "pending" | "active" | "quarantine" | "disposal" | "unlinked";

const statusLabels: Record<string, string> = {
  pending_technical_audit: "بانتظار الفحص التقني",
  validating: "بانتظار الفحص التقني",
  active: "نشط",
  quarantine_retention: "حجر — مدة الاحتفاظ",
  legal_hold: "حجز قانوني",
  disposal_eligible: "مؤهل للإتلاف",
  disposal_requested: "طلب إتلاف قيد المراجعة",
  disposal_approved: "مصرّح بالإتلاف",
  disposal_executing: "جارٍ الإتلاف",
  technical_rejected: "مرفوض تقنياً",
  duplicate_review: "مراجعة التكرار",
  pending_approval: "بانتظار الاعتماد",
};

const purgeStatusLabels: Record<string, string> = {
  requested: "قيد المراجعة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  executing: "جارٍ التنفيذ",
  completed: "مكتمل",
  failed: "فشل التنفيذ",
};

const auditQueueContracts = [
  ["quarantine", "الحجر"],
  ["orphan", "غير المرتبطة"],
  ["duplicate", "التكرار"],
  ["rights", "الحقوق"],
  ["validation", "الفحص التقني"],
  ["purge", "الإتلاف"],
] as const;

const activeLinks = (asset: VaultAsset) =>
  (asset.links || []).filter((link) => ["active", "pending"].includes(link.link_status));

const retentionDaysRemaining = (asset: VaultAsset) => {
  if (asset.retention_days_remaining !== null && asset.retention_days_remaining !== undefined) {
    return Math.max(0, asset.retention_days_remaining);
  }
  if (!asset.retention_expires_at) return 30;
  return Math.max(0, Math.ceil((new Date(asset.retention_expires_at).getTime() - Date.now()) / 86400000));
};

const formatBytes = (value: number | null) => {
  if (value === null) return "—";
  if (value >= 1048576) return `${(value / 1048576).toFixed(2)} MB`;
  return `${Math.ceil(value / 1024)} KB`;
};

export function MediaVaultWorkspace({
  onOpen,
  onUnauthorized,
}: {
  onOpen: (record: { entity: string; id: string }) => void;
  onUnauthorized: () => void;
}) {
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [role, setRole] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [queue, setQueue] = useState<QueueKey>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/media-vault", { cache: "no-store", credentials: "same-origin" });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      const result = (await response.json().catch(() => ({}))) as LoadResult;
      if (!response.ok) throw new Error(result.reason || "load_failed");
      const nextAssets = Array.isArray(result.assets)
        ? result.assets.filter((asset) => asset && typeof asset.id === "string" && asset.id.length > 0)
        : [];
      setAssets(nextAssets);
      setRole(result.role || "");
      setSelected((current) => current.filter((id) => nextAssets.some((asset) => asset.id === id)));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const metrics = useMemo(() => {
    const pending = assets.filter((asset) =>
      ["pending_technical_audit", "validating"].includes(asset.lifecycle_state) ||
      ["pending_technical_audit", "validating"].includes(asset.technical_status),
    ).length;
    const active = assets.filter((asset) => asset.lifecycle_state === "active").length;
    const quarantine = assets.filter((asset) =>
      ["quarantine_retention", "legal_hold"].includes(asset.lifecycle_state) || asset.legal_hold,
    ).length;
    const disposal = assets.filter((asset) =>
      ["disposal_eligible", "disposal_requested", "disposal_approved", "disposal_executing"].includes(asset.lifecycle_state),
    ).length;
    const unlinked = assets.filter((asset) => activeLinks(asset).length === 0).length;
    const staleUiElements = selected.filter((id) => !assets.some((asset) => asset.id === id)).length;
    return { pending, active, quarantine, disposal, unlinked, staleUiElements };
  }, [assets, selected]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("ar-IQ");
    return assets.filter((asset) => {
      const links = activeLinks(asset);
      const queueMatch =
        queue === "all" ||
        (queue === "pending" &&
          (["pending_technical_audit", "validating"].includes(asset.lifecycle_state) ||
            ["pending_technical_audit", "validating"].includes(asset.technical_status))) ||
        (queue === "active" && asset.lifecycle_state === "active") ||
        (queue === "quarantine" &&
          (["quarantine_retention", "legal_hold"].includes(asset.lifecycle_state) || asset.legal_hold)) ||
        (queue === "disposal" &&
          ["disposal_eligible", "disposal_requested", "disposal_approved", "disposal_executing"].includes(asset.lifecycle_state)) ||
        (queue === "unlinked" && links.length === 0);
      if (!queueMatch) return false;
      if (!needle) return true;
      return [
        asset.original_filename,
        asset.sha256_hex,
        asset.lifecycle_state,
        ...asset.links.map((link) => link.target_label || link.entity_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ar-IQ")
        .includes(needle);
    });
  }, [assets, query, queue]);

  const selectedAssets = assets.filter((asset) => selected.includes(asset.id));
  const inspected = selectedAssets.length === 1 ? selectedAssets[0] : null;
  const hasActiveLinks = selectedAssets.some((asset) => activeLinks(asset).length > 0);
  const hasLegalHold = selectedAssets.some((asset) => asset.legal_hold || asset.lifecycle_state === "legal_hold");
  const notQuarantined = selectedAssets.some((asset) => asset.lifecycle_state !== "quarantine_retention");
  const retentionRemaining = selectedAssets.length ? Math.max(...selectedAssets.map(retentionDaysRemaining)) : 0;
  const hasOpenDisposal = selectedAssets.some((asset) =>
    ["disposal_requested", "disposal_approved", "disposal_executing"].includes(asset.lifecycle_state),
  );

  const quarantineBlockers = selectedAssets.length === 0
    ? ["اختر أصلاً واحداً على الأقل"]
    : hasActiveLinks
      ? ["الأصل مرتبط بسجل نشط. افصل الارتباط أو حدّث السجل قبل الحجر."]
      : [];

  const disposalBlockers = selectedAssets.length === 0
    ? ["اختر أصلاً واحداً على الأقل"]
    : [
        ...(hasActiveLinks ? ["توجد روابط نشطة؛ لا يمكن طلب الإتلاف قبل فصلها."] : []),
        ...(hasLegalHold ? ["الحجز القانوني يمنع الإتلاف."] : []),
        ...(notQuarantined ? ["يجب أن يكون الأصل في حالة الحجر أولاً."] : []),
        ...(retentionRemaining > 0 ? [`باقي ${retentionRemaining} يوم من مدة الاحتفاظ النظامية.`] : []),
        ...(hasOpenDisposal ? ["يوجد طلب إتلاف مفتوح لهذا الأصل."] : []),
      ];

  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    if (!selectedAssets.length) return;
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/media-vault", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, assetIds: selectedAssets.map((asset) => asset.id), payload }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const labels: Record<string, string> = {
          active_record_links_block_quarantine: "لا يمكن حجر أصل مرتبط بسجل نشط. افصل الارتباط أو حدّث السجل أولاً.",
          active_links_block_purge: "لا يمكن طلب الإتلاف مع وجود روابط نشطة.",
          legal_hold_blocks_purge: "الحجز القانوني يمنع الإتلاف.",
          retention_period_active: "مدة الاحتفاظ البالغة 30 يوماً لم تكتمل بعد.",
          quarantine_required_before_purge: "يجب حجر الأصل قبل طلب الإتلاف.",
          admin_required: "هذه العملية تتطلب صلاحية مدير.",
          reviewer_required: "هذه العملية تتطلب صلاحية مدقق أو مدير.",
        };
        setMessage(labels[String(result.reason)] || `تعذر تنفيذ العملية: ${String(result.reason || "خطأ غير معروف")}`);
        return;
      }
      setMessage(action === "request_purge" ? "انتقلت إلى قائمة طلبات الإتلاف." : "تم تنفيذ العملية وتحديث حالة الأصل بنجاح.");
      setSelected([]);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const requestQuarantine = async () => {
    if (quarantineBlockers.length) {
      setMessage(quarantineBlockers.join(" "));
      return;
    }
    const reason = window.prompt("سبب الحجر (سيُسجّل في سجل التدقيق):", "مراجعة تشغيلية");
    if (!reason?.trim()) return;
    await act("quarantine", { reason: reason.trim() });
  };

  const requestDisposal = async () => {
    if (disposalBlockers.length) {
      setMessage(`طلب الإتلاف غير متاح: ${disposalBlockers.join(" ")}`);
      return;
    }
    const reason = window.prompt("سبب طلب الإتلاف:", "انتهاء الحاجة التشغيلية");
    if (!reason?.trim()) return;
    await act("request_purge", { reason: reason.trim() });
  };

  const reviewDisposal = async (approved: boolean) => {
    const note = window.prompt(approved ? "ملاحظة الموافقة:" : "سبب رفض الطلب:");
    if (!note?.trim()) return;
    await act(approved ? "approve_purge" : "reject_purge", { review_note: note.trim() });
  };

  const executeDisposal = async () => {
    if (!inspected || role !== "admin") return;
    const request = inspected.purge_requests.find((item) => item.status === "approved");
    if (!request) {
      setMessage("تنفيذ الإتلاف النهائي غير متاح: لا يوجد طلب إتلاف موافق عليه.");
      return;
    }
    setWorking(true);
    try {
      const response = await fetch("/api/admin/media-vault/purge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ requestId: request.id }),
      });
      const result = await response.json().catch(() => ({}));
      setMessage(response.ok ? "تم تنفيذ الإتلاف النهائي مع حفظ سجل التدقيق." : `تعذر تنفيذ الإتلاف النهائي: ${String(result.reason || "خطأ")}`);
      setSelected([]);
      await load();
    } finally {
      setWorking(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  if (state === "loading") return <div className="rounded-xl border border-[#dfd4c5] bg-white p-8">جارٍ تحميل خزنة الوسائط…</div>;
  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <b>تعذر تحميل خزنة الوسائط.</b>
        <button className="secondary mt-4" onClick={() => void load()}>إعادة المحاولة</button>
      </div>
    );
  }

  const cards: Array<{ key: QueueKey; title: string; value: number; note: string }> = [
    { key: "pending", title: "Pending Technical Audit", value: metrics.pending, note: "بانتظار الفحص التقني" },
    { key: "active", title: "Active", value: metrics.active, note: "جاهزة وآمنة للربط" },
    { key: "quarantine", title: "Quarantine / Legal Hold", value: metrics.quarantine, note: "مدة احتفاظ قدرها 30 يوماً" },
    { key: "disposal", title: "Disposal Requests", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" },
  ];

  return (
    <section
      className="space-y-5"
      dir="rtl"
      id="operations-media"
      data-governed-workspace="media"
      data-workspace-contract="master-detail-v1"
    >
      <MediaPreservationStatusStrip />

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#dfd4c5] bg-white p-5">
        <div>
          <span className="text-xs font-black tracking-wide text-[#6d371e]">Media Vault — خزنة الأصول</span>
          <h2 className="mt-1 text-2xl font-black">الصور والملفات</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#756b63]">
            دورة حياة الأصل المغلقة: تدقيق تقني، تفعيل، حجر/حجز قانوني، ثم إتلاف مضبوط. الفلاتر أدناه تقرأ الحالة الرسمية نفسها من قاعدة البيانات.
          </p>
          <p className="mt-2 text-xs font-bold text-[#6d371e]">لا يوجد حذف دائم مباشر من قائمة الأصول أو نتائج البحث.</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${metrics.staleUiElements === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          سلامة حالة الواجهة: {metrics.staleUiElements === 0 ? "0 عناصر يتيمة" : `${metrics.staleUiElements} عناصر يتيمة`}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button key={card.key} onClick={() => setQueue(card.key)} className={`rounded-xl border p-4 text-right transition ${queue === card.key ? "border-[#6d371e] bg-[#f7f1e8]" : "border-[#dfd4c5] bg-white hover:border-[#c89152]"}`}>
            <div className="text-xs font-black text-[#6d371e]">{card.title}</div>
            <div className="mt-2 text-3xl font-black">{card.value}</div>
            <div className="mt-1 text-xs text-[#756b63]">{card.note}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#dfd4c5] bg-white p-4">
        <button className={`secondary ${queue === "all" ? "bg-[#f7f1e8]" : ""}`} onClick={() => setQueue("all")}>كل الأصول ({assets.length})</button>
        <button className={`secondary ${queue === "unlinked" ? "bg-[#f7f1e8]" : ""}`} onClick={() => setQueue("unlinked")}>غير مرتبطة بسجل ({metrics.unlinked})</button>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو SHA-256 أو السجل المرتبط" className="min-w-[260px] flex-1 rounded-md border border-[#dfd4c5] bg-white px-3 py-2" />
      </div>

      <div className="rounded-xl border border-[#dfd4c5] bg-[#fffaf3] p-4 text-xs text-[#756b63]">
        <b className="text-[#3a1f12]">مسارات التدقيق المستقلة:</b>{" "}
        {auditQueueContracts.map(([, label]) => label).join(" · ")}.
        <span className="mr-2">تدقيق الأصول القديمة يتحقق من البايتات الفعلية ولا يخترع إثبات حقوق.</span>
      </div>

      {selectedAssets.length > 0 && (
        <div className="rounded-xl border border-[#dfd4c5] bg-[#fffaf3] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <b>{selectedAssets.length} أصل محدد</b>
              <div className="mt-1 text-xs text-[#756b63]">الحجر والإتلاف محجوبان مسبقاً عند وجود روابط نشطة. قاعدة البيانات تبقى طبقة الحماية النهائية.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="secondary" disabled={working || !hasActiveLinks || role !== "admin"} onClick={() => void act("unlink")}>فصل الروابط</button>
              <button className="secondary" disabled={working || quarantineBlockers.length > 0} onClick={() => void requestQuarantine()}>نقل إلى الحجر</button>
              <button className="secondary" disabled={working || disposalBlockers.length > 0} onClick={() => void requestDisposal()}>طلب إتلاف</button>
              {queue === "disposal" && role === "admin" && <button className="secondary" disabled={working} onClick={() => void reviewDisposal(true)}>اعتماد طلب الإتلاف</button>}
              {queue === "disposal" && role === "admin" && <button className="secondary" disabled={working} onClick={() => void reviewDisposal(false)}>رفض طلب الإتلاف</button>}
              {queue === "disposal" && role === "admin" && <button className="secondary" disabled={working || selectedAssets.length !== 1} onClick={() => void executeDisposal()}>تنفيذ الإتلاف النهائي</button>}
            </div>
          </div>
          {(quarantineBlockers.length > 0 || disposalBlockers.length > 0) && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {[...new Set([...quarantineBlockers, ...disposalBlockers])].join(" ")}
            </div>
          )}
        </div>
      )}

      {message && <div className="rounded-lg border border-[#c89152] bg-[#f7f1e8] p-3 text-sm font-bold text-[#3a1f12]">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="media-vault-assets overflow-hidden rounded-xl border border-[#dfd4c5] bg-white" data-governed-master="true">
          <div className="grid grid-cols-[42px_minmax(220px,1.5fr)_140px_120px_minmax(180px,1fr)_130px] gap-3 border-b border-[#dfd4c5] bg-[#f7f1e8] px-4 py-3 text-xs font-black text-[#6d371e]">
            <span /><span>الأصل</span><span>الحالة</span><span>الروابط</span><span>الحجر / المؤقت</span><span>الحجم</span>
          </div>
          {visible.length === 0 ? (
            <div className="p-8 text-center text-[#756b63]">لا توجد أصول ضمن هذا المسار التشغيلي.</div>
          ) : visible.map((asset) => {
            const links = activeLinks(asset);
            const remaining = retentionDaysRemaining(asset);
            const quarantined = ["quarantine_retention", "legal_hold"].includes(asset.lifecycle_state) || asset.legal_hold;
            return (
              <div key={asset.id} className="grid grid-cols-[42px_minmax(220px,1.5fr)_140px_120px_minmax(180px,1fr)_130px] gap-3 border-b border-[#eee4d8] px-4 py-4 text-sm last:border-b-0">
                <input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggleSelected(asset.id)} aria-label={`اختيار ${asset.original_filename}`} />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#dfd4c5] bg-[#f7f1e8]">{asset.preview_url ? <img src={asset.preview_url} alt="" className="h-full w-full object-cover" /> : null}</div>
                  <div className="min-w-0">
                    <b className="block truncate">{asset.original_filename}</b>
                    <span className="block truncate text-xs text-[#756b63]">{asset.sha256_hex ? `${asset.sha256_hex.slice(0, 16)}…` : "SHA-256 قيد الفحص"}</span>
                  </div>
                </div>
                <div>
                  <span className="rounded-full bg-[#efe7dc] px-2 py-1 text-xs font-bold text-[#6d371e]">{statusLabels[asset.lifecycle_state] || asset.lifecycle_state}</span>
                  {asset.legal_hold && <div className="mt-2 text-xs font-black text-red-700">Legal Hold</div>}
                </div>
                <div>
                  <b>{links.length}</b><div className="text-xs text-[#756b63]">روابط نشطة</div>
                  {links[0] && <button className="mt-1 text-xs font-bold text-[#6d371e] underline" onClick={() => onOpen({ entity: links[0].entity_type, id: links[0].entity_id })}>{links[0].target_label || "فتح السجل"}</button>}
                </div>
                <div>
                  {quarantined ? <>
                    <b>{asset.legal_hold ? "متوقف بسبب الحجز القانوني" : `${remaining} يوم متبقٍ`}</b>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee4d8]"><div className="h-full bg-[#6d371e]" style={{ width: `${Math.max(0, Math.min(100, ((30 - remaining) / 30) * 100))}%` }} /></div>
                    <div className="mt-1 text-xs text-[#756b63]">مدة احتفاظ قدرها 30 يوماً</div>
                  </> : <span className="text-[#756b63]">—</span>}
                </div>
                <div><b>{formatBytes(asset.byte_size)}</b><div className="text-xs text-[#756b63]">{asset.detected_mime || asset.declared_mime}</div>{asset.width && asset.height ? <div className="text-xs text-[#756b63]">{asset.width}×{asset.height}</div> : null}</div>
              </div>
            );
          })}
        </div>

        <aside className="media-vault-inspector rounded-xl border border-[#dfd4c5] bg-white p-4" data-governed-inspector="true">
          <h3 className="font-black">تفاصيل الأصل</h3>
          {!inspected ? <p className="mt-3 text-sm text-[#756b63]">حدد أصلاً واحداً لعرض تفاصيل الحوكمة.</p> : <div className="mt-4 space-y-4 text-sm">
            <div><b className="block">الكيانات المرتبطة</b><span className="text-[#756b63]">{activeLinks(inspected).length} روابط نشطة</span></div>
            <div><b className="block">تدقيق الحقوق والمصدر</b><span className="text-[#756b63]">{inspected.rights?.length || 0} سجلات حقوق</span></div>
            <div><b className="block">تعديل الوصف والبيانات</b><span className="text-[#756b63]">الوصف البديل المحفوظ: {inspected.links[0]?.alt_ar || "—"}. هذه العملية لا تشغّل الفحص التقني.</span></div>
            <div><b className="block">سجل التدقيق</b><span className="text-[#756b63]">{inspected.events?.length || 0} أحداث محفوظة</span></div>
            <div><b className="block">طلب الإتلاف</b><span className="text-[#756b63]">{purgeStatusLabels[inspected.purge_request_status || ""] || inspected.purge_request_status || "لا يوجد"}</span></div>
          </div>}
          <div className="mt-5 border-t border-[#eee4d8] pt-5">
            <MediaPreservationInspectorPanel />
          </div>
        </aside>
      </div>
    </section>
  );
}
