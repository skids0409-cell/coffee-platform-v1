"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GovernanceStatusSummary, LifecycleBadge, TransitionActionPanel } from "./GovernedWorkspace";

type MediaAsset = {
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

type VaultResponse = { assets?: MediaAsset[]; role?: string; reason?: string };
type ConformanceResponse = {
  baselineRevision?: string;
  conformanceStatus?: "CONFORMANT" | "NON_CONFORMANT";
  summary?: { totalRules?: number; passedRules?: number; failedRules?: number; criticalFailures?: number };
};

type ProjectionData = {
  assets: MediaAsset[];
  packages: PreservationPackage[];
  role: string;
  preservationSummary: { aipCount: number; dipCount: number; failedFixity: number };
  baselineRevision: string;
  conformanceStatus: "CONFORMANT" | "NON_CONFORMANT" | "UNKNOWN";
  passedRules: number;
  totalRules: number;
};

const emptyData: ProjectionData = {
  assets: [],
  packages: [],
  role: "",
  preservationSummary: { aipCount: 0, dipCount: 0, failedFixity: 0 },
  baselineRevision: "wave-c.phase8.v1",
  conformanceStatus: "UNKNOWN",
  passedRules: 0,
  totalRules: 0,
};

const fixityLabel = (value: string | null) => value === "success" ? "Verified" : value === "failure" ? "FAILED" : "Not verified";
const shortHash = (value: string | null) => value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";
const activeLinks = (asset: MediaAsset | undefined) => (asset?.links || []).filter((link) => ["active", "pending"].includes(String(link.link_status))).length;

function formatDate(value: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("ar-IQ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
  catch { return value; }
}

async function readProjection(): Promise<ProjectionData> {
  const [vaultResponse, preservationResponse, conformanceResponse] = await Promise.all([
    fetch("/api/admin/media-vault", { cache: "no-store", credentials: "same-origin" }),
    fetch("/api/admin/preservation", { cache: "no-store", credentials: "same-origin" }),
    fetch("/api/admin/architecture-conformance", { cache: "no-store", credentials: "same-origin" }),
  ]);
  if (!vaultResponse.ok || !preservationResponse.ok || !conformanceResponse.ok) throw new Error("projection_load_failed");
  const vault = await vaultResponse.json() as VaultResponse;
  const preservation = await preservationResponse.json() as PreservationResponse;
  const conformance = await conformanceResponse.json() as ConformanceResponse;
  return {
    assets: Array.isArray(vault.assets) ? vault.assets : [],
    packages: Array.isArray(preservation.packages) ? preservation.packages : [],
    role: preservation.role || vault.role || "",
    preservationSummary: {
      aipCount: Number(preservation.summary?.aipCount || 0),
      dipCount: Number(preservation.summary?.dipCount || 0),
      failedFixity: Number(preservation.summary?.failedFixity || 0),
    },
    baselineRevision: conformance.baselineRevision || "wave-c.phase8.v1",
    conformanceStatus: conformance.conformanceStatus || "UNKNOWN",
    passedRules: Number(conformance.summary?.passedRules || 0),
    totalRules: Number(conformance.summary?.totalRules || 0),
  };
}

export function MediaPreservationStatusStrip() {
  const [data, setData] = useState<ProjectionData>(emptyData);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async () => {
    try { setData(await readProjection()); setState("ready"); }
    catch { setState("error"); }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  if (state === "loading") return <div className="rounded-xl border border-[#dfd4c5] bg-white p-4 text-sm text-[#756b63]">جارٍ تحميل حالة الحفظ والحوكمة…</div>;
  if (state === "error") return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">تعذر قراءة حالة الحفظ المعمارية حالياً.</div>;

  const coverage = data.assets.filter((asset) => data.packages.some((item) => item.asset_id === asset.id && item.package_type === "AIP")).length;
  return <section className="rounded-xl border border-[#dfd4c5] bg-white p-4" aria-label="OAIS Preservation Status" data-preservation-status-strip>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><span className="text-xs font-black text-[#6d371e]">OAIS Preservation · Governance Projection</span><div className="mt-1 text-sm text-[#756b63]">حالة الحفظ، Fixity، والتوافق المعماري من المصدر الخلفي الرسمي.</div></div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${data.conformanceStatus === "CONFORMANT" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{data.conformanceStatus}</span>
    </div>
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
      <GovernanceStatusSummary label="AIP Coverage" value={`${coverage}/${data.assets.length}`} tone={coverage === data.assets.length ? "ready" : "blocked"} />
      <GovernanceStatusSummary label="AIP" value={data.preservationSummary.aipCount} tone="ready" />
      <GovernanceStatusSummary label="DIP" value={data.preservationSummary.dipCount} />
      <GovernanceStatusSummary label="Fixity Failures" value={data.preservationSummary.failedFixity} tone={data.preservationSummary.failedFixity === 0 ? "ready" : "blocked"} />
      <GovernanceStatusSummary label={data.baselineRevision} value={`${data.passedRules}/${data.totalRules} PASS`} tone={data.conformanceStatus === "CONFORMANT" ? "ready" : "blocked"} />
    </div>
  </section>;
}

export function MediaPreservationInspectorPanel() {
  const [data, setData] = useState<ProjectionData>(emptyData);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [observedSha256, setObservedSha256] = useState("");
  const [fixityNote, setFixityNote] = useState("");
  const [dipPurpose, setDipPurpose] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const next = await readProjection();
      setData(next);
      setSelectedAssetId((current) => current && next.assets.some((asset) => asset.id === current) ? current : (next.assets[0]?.id || ""));
      setState("ready");
    } catch { setState("error"); }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(handle);
  }, [load]);

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
      await load();
    } finally { setWorking(false); }
  };

  if (state === "loading") return <section className="mt-4 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3 text-sm text-[#756b63]">جارٍ تحميل OAIS Preservation…</section>;
  if (state === "error") return <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">تعذر تحميل بيانات OAIS Preservation.</section>;

  return <section className="mt-4 space-y-3 border-t border-[#eee4d8] pt-4" aria-label="Preservation & Governance" data-preservation-inspector>
    <div><span className="text-xs font-black text-[#6d371e]">Preservation & Governance</span><h4 className="font-black">OAIS / Fixity</h4></div>
    <label className="block text-xs font-bold">الأصل
      <select className="mt-1 w-full rounded-md border border-[#dfd4c5] bg-white px-2 py-2 text-sm" value={selectedAssetId} onChange={(event) => { setSelectedAssetId(event.target.value); setMessage(""); }}>
        {data.assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.original_filename}</option>)}
      </select>
    </label>

    {selectedAsset ? <div className="space-y-2 rounded-lg border border-[#eee4d8] bg-[#fffaf3] p-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>Lifecycle</b><LifecycleBadge label={latestAip?.lifecycle_state || selectedAsset.lifecycle_state} canonicalPhase={latestAip?.canonical_phase} /></div>
      <div className="grid grid-cols-2 gap-2"><span>Canonical Phase</span><b className="text-left">{latestAip?.canonical_phase || "—"}</b><span>SHA-256</span><b className="text-left" dir="ltr">{shortHash(selectedAsset.sha256_hex)}</b><span>Active Links</span><b className="text-left">{activeLinks(selectedAsset)}</b><span>Legal Hold</span><b className="text-left">{selectedAsset.legal_hold ? "YES" : "NO"}</b></div>
    </div> : null}

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

    <div className={`rounded-lg border p-3 text-xs ${data.conformanceStatus === "CONFORMANT" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
      <b>Architecture Conformance</b><div className="mt-1">{data.baselineRevision} · {data.conformanceStatus} · {data.passedRules}/{data.totalRules} PASS</div>
    </div>
    {message ? <div className="rounded-lg border border-[#c89152] bg-[#f7f1e8] p-2 text-xs font-bold text-[#3a1f12]" role="status">{message}</div> : null}
  </section>;
}
