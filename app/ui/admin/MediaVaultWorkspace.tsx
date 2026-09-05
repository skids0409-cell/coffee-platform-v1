"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";

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
  purge_requests: PurgeRequest[];
};

type LoadResult = {
  assets?: VaultAsset[];
  role?: string;
  reason?: string;
};

type QueueKey = "all" | "pending" | "active" | "quarantine" | "disposal" | "unlinked";

const statusLabels: Record<string, string> = {
  pending_technical_audit: "بانتظار التدقيق التقني",
  validating: "بانتظار التدقيق التقني",
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

const activeLinks = (asset: VaultAsset) =>
  (asset.links || []).filter((link) => ["active", "pending"].includes(link.link_status));

const retentionDaysRemaining = (asset: VaultAsset) => {
  if (asset.retention_days_remaining !== null && asset.retention_days_remaining !== undefined) {
    return Math.max(0, asset.retention_days_remaining);
  }
  if (!asset.retention_expires_at) return 30;
  return Math.max(0, Math.ceil((new Date(asset.retention_expires_at).getTime() - Date.now()) / 86400000));
};

const bytes = (value: number | null) => {
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
      const response = await fetch("/api/admin/media-vault", {
        cache: "no-store",
        credentials: "same-origin",
      });
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
      const haystack = [
        asset.original_filename,
        asset.sha256_hex,
        asset.lifecycle_state,
        ...asset.links.map((link) => link.target_label || link.entity_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ar-IQ");
      return haystack.includes(needle);
    });
  }, [assets, query, queue]);

  const selectedAssets = assets.filter((asset) => selected.includes(asset.id));
  const hasActiveLinks = selectedAssets.some((asset) => activeLinks(asset).length > 0);
  const hasLegalHold = selectedAssets.some((asset) => asset.legal_hold || asset.lifecycle_state === "legal_hold");
  const notQuarantined = selectedAssets.some((asset) => asset.lifecycle_state !== "quarantine_retention");
  const retentionRemaining = selectedAssets.length
    ? Math.max(...selectedAssets.map(retentionDaysRemaining))
    : 0;
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
      setSelected([]);
      setMessage("تم تنفيذ العملية وتحديث حالة الأصل بنجاح.");
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
      setMessage(disposalBlockers.join(" "));
      return;
    }
    const reason = window.prompt("سبب طلب الإتلاف:", "انتهاء الحاجة التشغيلية");
    if (!reason?.trim()) return;
    await act("request_purge", { reason: reason.trim() });
  };

  const toggleSelected = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  if (state === "loading") {
    return <div className="rounded-xl border border-[#dfd4c5] bg-white p-8">جارٍ تحميل خزنة الوسائط…</div>;
  }
  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8">
        <b>تعذر تحميل خزنة الوسائط.</b>
        <button className="secondary mt-4" onClick={() => void load()}>إعادة المحاولة</button>
      </div>
    );
  }

  const cards: Array<{ key: QueueKey; title: string; value: number; note: string }> = [
    { key: "pending", title: "Pending Technical Audit", value: metrics.pending, note: "بانتظار التدقيق التقني" },
    { key: "active", title: "Active", value: metrics.active, note: "جاهزة وآمنة للربط" },
    { key: "quarantine", title: "Quarantine / Legal Hold", value: metrics.quarantine, note: "حجر + مؤقت 30 يوماً" },
    { key: "disposal", title: "Disposal Requests", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" },
  ];

  return (
    <section className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-[#dfd4c5] bg-white p-5">
        <div>
          <span className="text-xs font-black tracking-wide text-[#6d371e]">MEDIA VAULT · PHASE 5</span>
          <h2 className="mt-1 text-2xl font-black">الصور والملفات</h2>
          <p className="mt-1 max-w-3xl text-sm text-[#756b63]">
            دورة حياة مغلقة للأصول: تدقيق تقني، تفعيل، حجر/حجز قانوني، ثم طلب إتلاف بعد اكتمال مدة الاحتفاظ.
          </p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${metrics.staleUiElements === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          سلامة حالة الواجهة: {metrics.staleUiElements === 0 ? "0 عناصر يتيمة" : `${metrics.staleUiElements} عناصر يتيمة`}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <button
            key={card.key}
            onClick={() => setQueue(card.key)}
            className={`rounded-xl border p-4 text-right transition ${queue === card.key ? "border-[#6d371e] bg-[#f7f1e8]" : "border-[#dfd4c5] bg-white hover:border-[#c89152]"}`}
          >
            <div className="text-xs font-black text-[#6d371e]">{card.title}</div>
            <div className="mt-2 text-3xl font-black">{card.value}</div>
            <div className="mt-1 text-xs text-[#756b63]">{card.note}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#dfd4c5] bg-white p-4">
        <button className={`secondary ${queue === "all" ? "bg-[#f7f1e8]" : ""}`} onClick={() => setQueue("all")}>كل الأصول ({assets.length})</button>
        <button className={`secondary ${queue === "unlinked" ? "bg-[#f7f1e8]" : ""}`} onClick={() => setQueue("unlinked")}>غير مرتبطة بسجل ({metrics.unlinked})</button>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="بحث بالاسم أو SHA-256 أو السجل المرتبط"
          className="min-w-[260px] flex-1 rounded-md border border-[#dfd4c5] bg-white px-3 py-2"
        />
      </div>

      {selectedAssets.length > 0 && (
        <div className="rounded-xl border border-[#dfd4c5] bg-[#fffaf3] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <b>{selectedAssets.length} أصل محدد</b>
              <div className="mt-1 text-xs text-[#756b63]">
                الحجر والإتلاف محجوبان مسبقاً عند وجود روابط نشطة. قاعدة البيانات تبقى طبقة الحماية النهائية.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="secondary" disabled={working || !hasActiveLinks || role !== "admin"} onClick={() => void act("unlink")}>فصل الروابط</button>
              <button className="secondary" disabled={working || quarantineBlockers.length > 0} onClick={() => void requestQuarantine()}>نقل إلى الحجر</button>
              <button className="secondary" disabled={working || disposalBlockers.length > 0} onClick={() => void requestDisposal()}>طلب إتلاف</button>
            </div>
          </div>
          {(quarantineBlockers.length > 0 || disposalBlockers.length > 0) && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {[...new Set([...quarantineBlockers, ...disposalBlockers])].join(" ")}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-[#c89152] bg-[#f7f1e8] p-3 text-sm font-bold text-[#3a1f12]">{message}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-[#dfd4c5] bg-white">
        <div className="grid grid-cols-[42px_minmax(220px,1.5fr)_140px_120px_minmax(180px,1fr)_150px] gap-3 border-b border-[#dfd4c5] bg-[#f7f1e8] px-4 py-3 text-xs font-black text-[#6d371e]">
          <span />
          <span>الأصل</span>
          <span>الحالة</span>
          <span>الروابط</span>
          <span>الحجر / المؤقت</span>
          <span>الحجم</span>
        </div>
        {visible.length === 0 ? (
          <div className="p-8 text-center text-[#756b63]">لا توجد أصول ضمن هذا المسار التشغيلي.</div>
        ) : (
          visible.map((asset) => {
            const links = activeLinks(asset);
            const remaining = retentionDaysRemaining(asset);
            const quarantined = ["quarantine_retention", "legal_hold"].includes(asset.lifecycle_state) || asset.legal_hold;
            return (
              <div key={asset.id} className="grid grid-cols-[42px_minmax(220px,1.5fr)_140px_120px_minmax(180px,1fr)_150px] gap-3 border-b border-[#eee4d8] px-4 py-4 text-sm last:border-b-0">
                <input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggleSelected(asset.id)} aria-label={`اختيار ${asset.original_filename}`} />
                <div className="flex min-w-0 items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#dfd4c5] bg-[#f7f1e8]">
                    {asset.preview_url ? <img src={asset.preview_url} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
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
                  <b>{links.length}</b>
                  <div className="text-xs text-[#756b63]">روابط نشطة</div>
                  {links[0] && (
                    <button className="mt-1 text-xs font-bold text-[#6d371e] underline" onClick={() => onOpen({ entity: links[0].entity_type, id: links[0].entity_id })}>
                      {links[0].target_label || "فتح السجل"}
                    </button>
                  )}
                </div>
                <div>
                  {quarantined ? (
                    <>
                      <b>{asset.legal_hold ? "متوقف بسبب الحجز القانوني" : `${remaining} يوم متبقٍ`}</b>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee4d8]">
                        <div className="h-full bg-[#6d371e]" style={{ width: `${Math.max(0, Math.min(100, ((30 - remaining) / 30) * 100))}%` }} />
                      </div>
                      <div className="mt-1 text-xs text-[#756b63]">مدة الاحتفاظ: 30 يوماً</div>
                    </>
                  ) : (
                    <span className="text-[#756b63]">—</span>
                  )}
                </div>
                <div>
                  <b>{bytes(asset.byte_size)}</b>
                  <div className="text-xs text-[#756b63]">{asset.detected_mime || asset.declared_mime}</div>
                  {asset.width && asset.height ? <div className="text-xs text-[#756b63]">{asset.width}×{asset.height}</div> : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
