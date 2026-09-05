"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { GovernanceStatusSummary, LifecycleBadge, TransitionActionPanel } from "./GovernedWorkspace";

export type MediaPreservationAsset = {
  id: string;
  original_filename: string;
  sha256_hex: string | null;
  lifecycle_state: string;
  legal_hold: boolean;
  retention_expires_at: string | null;
  retention_days_remaining: number | null;
  links?: Array<{ link_status?: string }>;
};

type PreservationPackage = {
  package_id: string;
  asset_id: string;
  package_type: "SIP" | "AIP" | "DIP";
  package_version: number;
  source_package_id: string | null;
  content_sha256_hex: string;
  byte_size: number;
  designated_community: string;
  created_at: string;
  lifecycle_state: string;
  canonical_phase: string;
  latest_fixity_outcome: string | null;
  latest_fixity_at: string | null;
};

type PreservationResponse = {
  authenticated?: boolean;
  role?: string;
  packages?: PreservationPackage[];
  summary?: { aipCount?: number; dipCount?: number; failedFixity?: number };
  reason?: string;
};

type ConformanceResponse = {
  baselineRevision?: string;
  conformanceStatus?: "CONFORMANT" | "NON_CONFORMANT";
  summary?: { totalRules?: number; passedRules?: number; failedRules?: number; criticalFailures?: number };
  reason?: string;
};

type PreservationProjection = {
  assets: MediaPreservationAsset[];
  packages: PreservationPackage[];
  role: string;
  preservationSummary: { aipCount: number; dipCount: number; failedFixity: number };
};

type ConformanceProjection = {
  baselineRevision: string;
  conformanceStatus: "CONFORMANT" | "NON_CONFORMANT" | "UNKNOWN";
  passedRules: number;
  totalRules: number;
  available: boolean;
};

type ProjectionState = {
  data: PreservationProjection;
  conformance: ConformanceProjection;
  state: "loading" | "ready" | "error";
  errorMessage: string;
  refresh: () => Promise<void>;
};

const emptyConformance: ConformanceProjection = {
  baselineRevision: "wave-c.phase8.v1",
  conformanceStatus: "UNKNOWN",
  passedRules: 0,
  totalRules: 0,
  available: false,
};

const ProjectionContext = createContext<ProjectionState | null>(null);

const fixityLabel = (value: string | null) => value === "success" ? "Verified" : value === "failure" ? "FAILED" : "Not verified";
const shortHash = (value: string | null) => value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";
const activeLinks = (asset: MediaPreservationAsset | undefined) => (asset?.links || []).filter((link) => ["active", "pending"].includes(String(link.link_status))).length;

function formatDate(value: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return value; }
}

async function readEndpoint<T extends { reason?: string }>(url: string, label: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
  const body = await response.json().catch(() => ({})) as T;
  if (!response.ok) throw new Error(`${label}:${body.reason || response.status}`);
  return body;
}

async function readPreservationProjection(assets: MediaPreservationAsset[], vaultRole: string): Promise<PreservationProjection> {
  const preservation = await readEndpoint<PreservationResponse>("/api/admin/preservation", "preservation");
  return {
    assets,
    packages: Array.isArray(preservation.packages) ? preservation.packages : [],
    role: preservation.role || vaultRole || "",
    preservationSummary: {
      aipCount: Number(preservation.summary?.aipCount || 0),
      dipCount: Number(preservation.summary?.dipCount || 0),
      failedFixity: Number(preservation.summary?.failedFixity || 0),
    },
  };
}

async function readConformanceProjection(): Promise<ConformanceProjection> {
  const conformance = await readEndpoint<ConformanceResponse>("/api/admin/architecture-conformance", "architecture_conformance");
  return {
    baselineRevision: conformance.baselineRevision || "wave-c.phase8.v1",
    conformanceStatus: conformance.conformanceStatus || "UNKNOWN",
    passedRules: Number(conformance.summary?.passedRules || 0),
    totalRules: Number(conformance.summary?.totalRules || 0),
    available: true,
  };
}

function loadErrorLabel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("preservation:")) return "تعذر تحميل سجل OAIS Preservation من واجهة الحفظ.";
  return "تعذر تحميل بيانات الحفظ حالياً.";
}

export function MediaPreservationProvider({ assets, role, children }: { assets: MediaPreservationAsset[]; role: string; children: ReactNode }) {
  const [data, setData] = useState<PreservationProjection>({ assets, packages: [], role, preservationSummary: { aipCount: 0, dipCount: 0, failedFixity: 0 } });
  const [conformance, setConformance] = useState<ConformanceProjection>(emptyConformance);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = useCallback(async () => {
    setState("loading");
    setErrorMessage("");
    const [preservationResult, conformanceResult] = await Promise.allSettled([
      readPreservationProjection(assets, role),
      readConformanceProjection(),
    ]);
    if (preservationResult.status === "rejected") {
      setErrorMessage(loadErrorLabel(preservationResult.reason));
      setState("error");
      return;
    }
    setData(preservationResult.value);
    setConformance(conformanceResult.status === "fulfilled" ? conformanceResult.value : emptyConformance);
    setState("ready");
  }, [assets, role]);

  useEffect(() => {
    const handle = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  const value = useMemo(() => ({ data, conformance, state, errorMessage, refresh }), [data, conformance, state, errorMessage, refresh]);
  return <ProjectionContext.Provider value={value}>{children}</ProjectionContext.Provider>;
}

function useProjection() {
  const value = useContext(ProjectionContext);
  if (!value) throw new Error("MediaPreservationProvider is required");
  return value;
}

export function MediaPreservationStatusStrip() {
  const { data, conformance, state, errorMessage, refresh } = useProjection();

  if (state === "loading") return <div className="rounded-xl border border-[#dfd4c5] bg-white p-4 text-sm text-[#756b63]">جارٍ تحميل حالة الحفظ والحوكمة…</div>;
  if (state === "error") return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>{errorMessage}</span><button type="button" className="secondary" onClick={() => void refresh()}>إعادة المحاولة</button></div>;

  const coverage = data.assets.filter((asset) => data.packages.some((item) => item.asset_id === asset.id && item.package_type === "AIP")).length;
  const conformanceTone = conformance.conformanceStatus === "CONFORMANT" ? "ready" : conformance.conformanceStatus === "NON_CONFORMANT" ? "blocked" : "neutral";
  return <section className="rounded-xl border border-[#dfd4c5] bg-white p-4" aria-label="OAIS Preservation Status" data-preservation-status-strip>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><span className="text-xs font-black text-[#6d371e]">OAIS Preservation · Governance Projection</span><div className="mt-1 text-sm text-[#756b63]">حالة الحفظ وFixity من واجهة OAIS الرسمية؛ التوافق المعماري يُقرأ بشكل مستقل ولا يعطل بيانات الحفظ.</div></div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${conformance.conformanceStatus === "CONFORMANT" ? "bg-emerald-50 text-emerald-800" : conformance.conformanceStatus === "NON_CONFORMANT" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{conformance.available ? conformance.conformanceStatus : "CONFORMANCE UNAVAILABLE"}</span>
    </div>
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      <GovernanceStatusSummary label="AIP Coverage" value={`${coverage}/${data.assets.length}`} tone={coverage === data.assets.length ? "ready" : "blocked"} />
      <GovernanceStatusSummary label="AIP" value={data.preservationSummary.aipCount} tone="ready" />
      <GovernanceStatusSummary label="DIP" value={data.preservationSummary.dipCount} />
      <GovernanceStatusSummary label="Fixity Failures" value={data.preservationSummary.failedFixity} tone={data.preservationSummary.failedFixity === 0 ? "ready" : "blocked"} />
      <GovernanceStatusSummary label={conformance.baselineRevision} value={conformance.available ? `${conformance.passedRules}/${conformance.totalRules} PASS` : "غير متاح حالياً"} tone={conformanceTone} />
    </div>
  </section>;
}

export function MediaPreservationInspectorPanel({ selectedAssetId }: { selectedAssetId: string }) {
  const { data, conformance, state, errorMessage, refresh } = useProjection();
  const [observedSha256, setObservedSha256] = useState("");
  const [fixityNote, setFixityNote] = useState("");
  const [dipPurpose, setDipPurpose] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setObservedSha256("");
    setFixityNote("");
    setDipPurpose("");
    setMessage("");
  }, [selectedAssetId]);

  const selectedAsset = data.assets.find((asset) => asset.id === selectedAssetId);
  const selectedPackages = useMemo(() => data.packages.filter((item) => item.asset_id === selectedAssetId), [data.packages, selectedAssetId]);
  const latestAip = selectedPackages.filter((item) => item.package_type === "AIP").sort((a, b) => b.package_version - a.package_version)[0];
  const latestDip = selectedPackages.filter((item) => item.package_type === "DIP").sort((a, b) => b.package_version - a.package_version)[0];
  const canOperate = ["verifier", "admin"].includes(data.role);

  const perform = async (body: Record<string, unknown>, success: string) => {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/preservation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { reason?: string };
      if (!response.ok) {
        const labels: Record<string, string> = {
          verifier_required: "تتطلب العملية صلاحية مدقق أو مدير.",
          asset_fixity_incomplete: "الأصل لا يملك SHA-256/حجم صالحين لإنشاء AIP.",
          asset_disposition_in_progress: "لا يمكن إنشاء حزمة حفظ أثناء التصرف النهائي في الأصل.",
          invalid_fixity_input: "أدخل SHA-256 ملاحظاً صالحاً من 64 خانة hexadecimal.",
          preservation_package_not_found: "حزمة الحفظ غير موجودة.",
          dissemination_purpose_required: "أدخل غرضاً واضحاً لإنشاء DIP.",
        };
        setMessage(labels[String(result.reason)] || `تعذر تنفيذ عملية الحفظ: ${String(result.reason || "upstream_error")}`);
        return;
      }
      setMessage(success);
      setObservedSha256("");
      setFixityNote("");
      setDipPurpose("");
      await refresh();
    } finally { setWorking(false); }
  };

  if (!selectedAssetId) return <section className="mt-4 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3 text-sm text-[#756b63]">حدد أصلاً واحداً في Media Vault لعرض OAIS / Fixity لنفس الأصل.</section>;
  if (state === "loading") return <section className="mt-4 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3 text-sm text-[#756b63]">جارٍ تحميل OAIS Preservation…</section>;
  if (state === "error") return <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div>{errorMessage}</div><button type="button" className="secondary mt-3" onClick={() => void refresh()}>إعادة المحاولة</button></section>;

  return <section className="mt-4 space-y-3 border-t border-[#eee4d8] pt-4" aria-label="Preservation & Governance" data-preservation-inspector>
    <div><span className="text-xs font-black text-[#6d371e]">Preservation & Governance</span><h4 className="font-black">OAIS / Fixity</h4>{selectedAsset ? <small className="text-[#756b63]">{selectedAsset.original_filename}</small> : null}</div>

    {selectedAsset ? <div className="space-y-2 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>Lifecycle</b><LifecycleBadge label={latestAip?.lifecycle_state || selectedAsset.lifecycle_state} canonicalPhase={latestAip?.canonical_phase} /></div>
      <div className="grid grid-cols-2 gap-2"><span>Canonical Phase</span><b className="text-left">{latestAip?.canonical_phase || "—"}</b><span>SHA-256</span><b className="text-left" dir="ltr">{shortHash(selectedAsset.sha256_hex)}</b><span>Active Links</span><b className="text-left">{activeLinks(selectedAsset)}</b><span>Legal Hold</span><b className="text-left">{selectedAsset.legal_hold ? "YES" : "NO"}</b></div>
    </div> : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">الأصل المحدد لم يعد موجوداً في القراءة الحالية. حدّث Media Vault.</div>}

    <div className="rounded-lg border border-[#eee4d8] bg-white p-3 text-xs">
      <div className="flex items-center justify-between gap-2"><b>Archival Information Package (AIP)</b><span className={`rounded-full px-2 py-1 font-black ${latestAip ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{latestAip ? `AIP v${latestAip.package_version}` : "Missing"}</span></div>
      {latestAip ? <div className="mt-2 space-y-1 text-[#756b63]"><div>Community: {latestAip.designated_community}</div><div>Created: {formatDate(latestAip.created_at)}</div><div>Package ID: <span dir="ltr">{latestAip.package_id}</span></div></div> : <p className="mt-2 text-[#756b63]">لا توجد AIP لهذا الأصل بعد.</p>}
    </div>

    <div className={`rounded-lg border p-3 text-xs ${latestAip?.latest_fixity_outcome === "failure" ? "border-red-200 bg-red-50" : "border-[#eee4d8] bg-white"}`}>
      <div className="flex items-center justify-between gap-2"><b>Fixity Verification</b><span className="font-black">{fixityLabel(latestAip?.latest_fixity_outcome || null)}</span></div>
      <div className="mt-2 text-[#756b63]">آخر تحقق: {formatDate(latestAip?.latest_fixity_at || null)}</div>
    </div>

    <TransitionActionPanel title="Preservation Actions · إجراءات الحفظ">
      {!canOperate ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">العرض متاح؛ التنفيذ يتطلب verifier أو admin.</div> : null}
      <div className="space-y-3">
        <button className="secondary w-full" disabled={working || !canOperate || !selectedAsset || Boolean(latestAip)} onClick={() => selectedAsset && void perform({ action: "create_aip", assetId: selectedAsset.id, representationInformation: { source: "media-vault-operator-ui" }, preservationContext: { operator_projection: true } }, "تم إنشاء AIP وتحديث حالة الحفظ.")}>Create AIP · إنشاء حزمة حفظ</button>
        <div className="rounded-lg border border-[#eee4d8] p-2">
          <label className="block text-xs font-bold">Observed SHA-256
            <input dir="ltr" value={observedSha256} onChange={(event) => setObservedSha256(event.target.value.trim().toLowerCase())} placeholder="64 hex characters from an independent byte-level check" className="mt-1 w-full rounded-md border border-[#dfd4c5] px-2 py-2 font-mono text-xs" />
          </label>
          <label className="mt-2 block text-xs font-bold">ملاحظة التحقق
            <input value={fixityNote} onChange={(event) => setFixityNote(event.target.value)} placeholder="مصدر/أداة التحقق، إن وجدت" className="mt-1 w-full rounded-md border border-[#dfd4c5] px-2 py-2 text-xs" />
          </label>
          <button className="secondary mt-2 w-full" disabled={working || !canOperate || !latestAip || !/^[0-9a-f]{64}$/.test(observedSha256)} onClick={() => latestAip && void perform({ action: "verify_fixity", packageId: latestAip.package_id, observedSha256, note: fixityNote }, "تم تسجيل Fixity verification في سجل الحفظ غير القابل للتعديل.")}>Verify Fixity · تحقق البصمة</button>
          <p className="mt-2 text-[11px] leading-5 text-[#756b63]">القيمة المدخلة يجب أن تأتي من فحص مستقل للبايتات؛ الواجهة لا تفترض أن SHA المخزن هو نتيجة فحص جديد.</p>
        </div>
        <div className="rounded-lg border border-[#eee4d8] p-2">
          <label className="block text-xs font-bold">غرض التوزيع (DIP)
            <input value={dipPurpose} onChange={(event) => setDipPurpose(event.target.value)} placeholder="مثال: نسخة تدقيق للمراجع" className="mt-1 w-full rounded-md border border-[#dfd4c5] px-2 py-2 text-xs" />
          </label>
          <button className="secondary mt-2 w-full" disabled={working || !canOperate || !latestAip || dipPurpose.trim().length < 5} onClick={() => latestAip && void perform({ action: "create_dip", packageId: latestAip.package_id, purpose: dipPurpose.trim(), designatedCommunity: latestAip.designated_community }, "تم إنشاء DIP مسجل ومشتق من AIP.")}>Create DIP · إنشاء حزمة توزيع</button>
          {latestDip ? <div className="mt-2 text-[11px] text-[#756b63]">آخر DIP: v{latestDip.package_version} · {formatDate(latestDip.created_at)}</div> : null}
        </div>
      </div>
    </TransitionActionPanel>

    <div className={`rounded-lg border p-3 text-xs ${conformance.conformanceStatus === "CONFORMANT" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : conformance.conformanceStatus === "NON_CONFORMANT" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <b>Architecture Conformance</b><div className="mt-1">{conformance.available ? `${conformance.baselineRevision} · ${conformance.conformanceStatus} · ${conformance.passedRules}/${conformance.totalRules} PASS` : "حالة التوافق غير متاحة حالياً، بينما بيانات OAIS أعلاه ما زالت فعالة."}</div>
    </div>
    {message ? <div className="rounded-lg border border-[#c89152] bg-[#f7f1e8] p-2 text-xs font-bold text-[#3a1f12]" role="status">{message}</div> : null}
  </section>;
}
