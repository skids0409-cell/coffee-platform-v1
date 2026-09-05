"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import { OperationsWorkspaceShell, type OperationsWorkspaceId } from "@/app/ui/admin/OperationsWorkspaceShell";
import { OperationsDashboardWorkspace, type QualitySuspectView } from "@/app/ui/admin/OperationsDashboardWorkspace";
import { RecordsWorkspace } from "@/app/ui/admin/RecordsWorkspace";
import { ReviewWorkspace } from "@/app/ui/admin/ReviewWorkspace";
import { MediaVaultWorkspace } from "@/app/ui/admin/MediaVaultWorkspace";
import { DataCenterWorkspace } from "@/app/ui/admin/DataCenterWorkspace";
import { CatalogDraftWorkspace } from "@/app/ui/admin/CatalogDraftWorkspace";
import { PartnerReviewQueue } from "@/app/ui/admin/PartnerReviewQueue";
import { SearchGovernanceWorkspace } from "@/app/ui/admin/SearchGovernanceWorkspace";
import { SearchTermEditForm } from "@/app/ui/admin/SearchTermEditForm";
import { SupportWorkspace } from "@/app/ui/admin/SupportWorkspace";
import { ArchiveWorkspace } from "@/app/ui/admin/ArchiveWorkspace";
import { ArchivedImportBatches } from "@/app/ui/admin/ArchivedImportBatches";
import { TaxonomyWorkspace } from "@/app/ui/admin/TaxonomyWorkspace";
import { ReviewRecordEditor } from "@/app/ui/admin/ReviewRecordEditor";
import { QualityIssueEditor } from "@/app/ui/admin/QualityIssueEditor";
import type { SearchEntityType, SearchIntent } from "@/lib/search-governance";

type Role = "editor" | "verifier" | "admin";

type QueueRow = {
  id: string;
  label: string;
  status: string;
  evidence: string;
  updated_at: string | null;
  ready: boolean;
  blockers: string[];
  warnings: string[];
};

type SearchTerm = {
  id: string;
  canonical_term_ar: string;
  canonical_term_en: string | null;
  aliases: string[];
  intent: SearchIntent;
  entity_scope: SearchEntityType[];
  match_mode: string;
  weight: number;
  source_basis: string;
  status: "draft" | "active" | "retired";
  updated_at: string;
};

type QualitySuspect = QualitySuspectView & {
  entityId: string | null;
  issueDetails?: {
    issueCode: string;
    issueType: string | null;
    fieldCode: string | null;
    message: string;
    createdAt: string;
    batchCode: string | null;
    sourceLabel: string | null;
    sourceRowNumber: number | null;
    rawPayload: Record<string, unknown> | null;
    normalizedPayload: Record<string, unknown> | null;
  };
};

type AdminData = {
  profile: { display_name: string | null; role: Role };
  queues: Record<string, QueueRow[]>;
  searchGovernance: {
    terms: SearchTerm[];
    weakQueries: Array<{ query: string; searches: number; zeroResults: number; lowResults: number; lastSearchedAt: string; inferredIntent: SearchIntent }>;
    totalEventsReviewed: number;
    activeTerms: number;
    draftTerms: number;
  };
  supportWorkspace: { requests: any[]; staff: any[] };
  inactiveCatalog: Array<{ entity: string; id: string; label: string; status: string; updated_at: string }>;
  publishedCatalog: Array<{ entity: string; section: string; group: string; id: string; label: string; meta: string; updated_at: string }>;
  qualityDesk: {
    summary: { openIssues: number; missingProductImages: number; missingOfferImages: number; recordsPendingReview: number };
    suspects: QualitySuspect[];
    mediaBacklog: Array<{ entity: string; id: string; label: string; kind: string }>;
  };
};

const arabicLetters = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"];
const queueEntityMap: Record<string, string> = { products: "products", brands: "brands", organizations: "organizations", offers: "offers", contents: "contents", origins: "origin_claims" };
const queueStatusLabels: Record<string, string> = { draft: "مسودة", in_review: "قيد المراجعة", submitted: "طلب جديد", needs_evidence: "بانتظار دليل إضافي", published: "منشور", rejected: "مرفوض", archived: "مؤرشف" };
const roleLabels: Record<Role, string> = { editor: "محرر", verifier: "مراجع", admin: "مدير" };
const searchIntentLabels: Record<SearchIntent, string> = { broad: "بحث عام", product: "منتج", organization: "جهة", content: "معرفة", origin: "مصدر قهوة", unknown: "غير محدد" };
const searchTypeLabels: Record<SearchEntityType, string> = { product: "المنتجات", organization: "الجهات", content: "المعرفة", origin: "المصادر" };

const normalizeFirstLetter = (value: string) => value.trim().replace(/^[إأآ]/, "ا").charAt(0);

function adoptAdminPayload(current: AdminData, payload: any): AdminData {
  return {
    ...current,
    queues: payload.queues ?? current.queues,
    searchGovernance: payload.searchGovernance ?? current.searchGovernance,
    supportWorkspace: payload.supportWorkspace ?? current.supportWorkspace,
    publishedCatalog: payload.publishedCatalog ?? current.publishedCatalog,
    inactiveCatalog: payload.inactiveCatalog ?? current.inactiveCatalog,
    qualityDesk: payload.qualityDesk ?? current.qualityDesk,
  };
}

export function OperationsController() {
  const [adminState, setAdminState] = useState<"loading" | "signed_out" | "ready" | "error">("loading");
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [recordEditor, setRecordEditor] = useState<{ entity: string; id: string } | null>(null);
  const [qualityIssueEditor, setQualityIssueEditor] = useState<QualitySuspect | null>(null);
  const [editingSearchTermId, setEditingSearchTermId] = useState("");
  const [searchTermView, setSearchTermView] = useState<"active" | "draft" | "retired" | "all">("active");
  const [searchTermQuery, setSearchTermQuery] = useState("");
  const [searchLetter, setSearchLetter] = useState("all");
  const [publishedType, setPublishedType] = useState("all");
  const [publishedGroup, setPublishedGroup] = useState("all");
  const [publishedQuery, setPublishedQuery] = useState("");
  const [workspace, setWorkspace] = useState<OperationsWorkspaceId>("dashboard");

  const loadAdmin = async () => {
    const response = await fetch("/api/admin/review", { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) {
      setAdminState("signed_out");
      setAdminData(null);
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.reason || "load_failed");
    setAdminData(data);
    setAdminState("ready");
  };

  useEffect(() => {
    const handle = window.setTimeout(() => void loadAdmin().catch(() => setAdminState("error")), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    if (!response.ok) { setAdminMessage("تعذر الدخول. تحقق من بريد وكلمة مرور مستخدم Supabase."); return; }
    setAdminState("loading");
    await loadAdmin().catch(() => setAdminState("error"));
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    setAdminState("signed_out");
    setAdminData(null);
    setWorkspace("dashboard");
  };

  const setReviewStatus = async (table: string, id: string, next: string, overrideReason = "") => {
    if (next === "published" && !window.confirm("هذا الإجراء سينشر السجل فوراً. هل راجعت المصدر والحقول وتريد المتابعة؟")) return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ table, id, status: next, overrideReason }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) {
      setAdminMessage(data.reason === "publish_requirements" ? `تعذر النشر: ${(data.blockers || ["السجل لا يحقق متطلبات الاعتماد"]).join("، ")}` : "تعذر تحديث السجل. أعد تسجيل الدخول ثم حاول مجدداً.");
      return;
    }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setAdminMessage("تم تحديث الحالة وتسجيل العملية في سجل التدقيق.");
  };

  const deleteCatalogRecord = async (table: string, id: string, label: string) => {
    const typed = window.prompt(`حذف نهائي للسجل غير المنشور «${label}» مع علاقاته. اكتب كلمة حذف للتأكيد:`);
    if (typed?.trim() !== "حذف") return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_catalog_record", table, id }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage(data.reason === "record_has_dependencies" ? "لا يمكن حذف السجل لأن سجلات أخرى تعتمد عليه. افصل العلاقات أو أرشفه." : "تعذر حذف السجل."); return; }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setAdminMessage("حُذف السجل غير المنشور نهائياً وسُجلت العملية.");
  };

  const processRightsRequest = async (id: string, status: string) => {
    const final = ["approved", "rejected", "closed"].includes(status);
    const resolutionNote = final ? window.prompt("اكتب نتيجة المعالجة وسبب القرار (10 أحرف على الأقل):") || "" : "";
    if (final && resolutionNote.trim().length < 10) return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "process_rights_request", id, status, resolutionNote }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage("تعذر معالجة طلب الحقوق؛ القرار النهائي يحتاج ملاحظة واضحة."); return; }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setAdminMessage("تم تحديث طلب الحقوق وتوثيق القرار.");
  };

  const createSearchTerm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorkingId("new-search-term");
    setAdminMessage("");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_search_term",
        canonicalTermAr: String(form.get("canonicalTermAr") || ""),
        canonicalTermEn: form.get("canonicalTermEn"),
        aliases: String(form.get("aliases") || "").split(/[،,]/).map((value) => value.trim()).filter(Boolean),
        intent: String(form.get("intent") || ""),
        entityScope: form.getAll("entityScope").map(String),
        matchMode: form.get("matchMode"),
        weight: Number(form.get("weight")),
        sourceBasis: form.get("sourceBasis"),
      }),
    });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage(data.reason === "invalid_input" ? "أكمل المصطلح والمقصد وحدد قسماً واحداً على الأقل." : "تعذر إنشاء المصطلح؛ تحقق من أنه غير مكرر."); return; }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    formElement.reset();
    setAdminMessage("أضيف المصطلح كمسودة. راجعه ثم فعّله من القائمة.");
  };

  const setSearchTermStatus = async (id: string, next: "draft" | "active" | "retired") => {
    if (next === "active" && !window.confirm("سيؤثر هذا المصطلح فوراً في فهم البحث وترتيب النتائج. هل راجعت معناه والمرادفات؟")) return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set_search_term_status", id, status: next }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage("تعذر تغيير حالة المصطلح. أعد تسجيل الدخول ثم حاول مجدداً."); return; }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setAdminMessage("تم تحديث قاعدة البحث وتسجيل القرار.");
  };

  const deleteSearchTerm = async (id: string) => {
    if (!window.confirm("سيُحذف هذا المصطلح غير الفعال نهائياً من القاموس. هل تريد المتابعة؟")) return;
    setWorkingId(id);
    const response = await fetch("/api/admin/review", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_search_term", id }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage(data.reason === "active_term_cannot_be_deleted" ? "أوقف المصطلح الفعال أولاً ثم احذفه." : "تعذر حذف المصطلح."); return; }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setAdminMessage("حُذف المصطلح غير الفعال وسُجلت العملية.");
  };

  const visibleSearchTerms = useMemo(() => (adminData?.searchGovernance.terms || [])
    .filter((term) => (searchTermView === "all" || term.status === searchTermView) && (searchLetter === "all" || normalizeFirstLetter(term.canonical_term_ar) === searchLetter) && (!searchTermQuery.trim() || [term.canonical_term_ar, term.canonical_term_en, ...term.aliases].filter(Boolean).join(" ").toLocaleLowerCase("ar-IQ").includes(searchTermQuery.trim().toLocaleLowerCase("ar-IQ"))))
    .sort((a, b) => a.canonical_term_ar.localeCompare(b.canonical_term_ar, "ar")), [adminData, searchTermView, searchLetter, searchTermQuery]);

  const publishedGroups = useMemo(() => [...new Set((adminData?.publishedCatalog || []).filter((item) => publishedType === "all" || item.section === publishedType).map((item) => item.group))].sort((a, b) => a.localeCompare(b, "ar")), [adminData, publishedType]);
  const visiblePublished = useMemo(() => (adminData?.publishedCatalog || []).filter((item) => (publishedType === "all" || item.section === publishedType) && (publishedGroup === "all" || item.group === publishedGroup) && (!publishedQuery.trim() || `${item.label} ${item.meta} ${item.group}`.toLocaleLowerCase("ar-IQ").includes(publishedQuery.trim().toLocaleLowerCase("ar-IQ")))), [adminData, publishedType, publishedGroup, publishedQuery]);

  const qualityRecordCandidates = useMemo(() => {
    const map = new Map<string, { entity: string; id: string; label: string }>();
    for (const item of adminData?.publishedCatalog || []) map.set(`${item.entity}:${item.id}`, { entity: item.entity, id: item.id, label: item.label });
    for (const [queueKey, entity] of Object.entries(queueEntityMap)) for (const item of adminData?.queues[queueKey] || []) map.set(`${entity}:${item.id}`, { entity, id: item.id, label: item.label });
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "ar"));
  }, [adminData]);

  if (adminState === "loading") return <div className="operations"><section className="admin-review-panel"><p role="status">جارٍ فحص جلسة الإدارة…</p></section></div>;
  if (adminState === "error") return <div className="operations"><section className="admin-review-panel"><div className="directory-state compact"><h3>تعذر تحميل لوحة الإدارة</h3><p>لم يتغير أي سجل. أعد تحميل الصفحة أو سجّل الدخول من جديد.</p><button type="button" onClick={() => { setAdminState("loading"); void loadAdmin().catch(() => setAdminState("error")); }}>إعادة المحاولة</button></div></section></div>;
  if (adminState === "signed_out" || !adminData) return <div className="operations"><section className="admin-review-panel"><div className="section-head"><div><span className="eyebrow">Governed Operations Center</span><h2>دخول فريق البيانات</h2></div></div><form className="admin-login" onSubmit={login}><label>البريد الإلكتروني<input type="email" name="email" autoComplete="email" required /></label><label>كلمة المرور<input type="password" name="password" autoComplete="current-password" required /></label><button className="primary" type="submit">تسجيل الدخول</button>{adminMessage && <p className="admin-message" role="status">{adminMessage}</p>}</form></section></div>;

  const panels = {
    dashboard: <OperationsDashboardWorkspace checks={[["جلسة الإدارة", "متصلة"], ["حاجز النشر", "مفعّل"], ["نطاق التشغيل", "بغداد"], ["معمارية الواجهة", "Operations Center v2"]]} summary={adminData.qualityDesk.summary} suspects={adminData.qualityDesk.suspects} onOpenIssue={(issue) => setQualityIssueEditor(issue as QualitySuspect)} onOpenRecord={setRecordEditor} />,
    records: <RecordsWorkspace items={adminData.publishedCatalog} visibleItems={visiblePublished} publishedType={publishedType} publishedGroup={publishedGroup} publishedGroups={publishedGroups} publishedQuery={publishedQuery} onTypeChange={(value) => { setPublishedType(value); setPublishedGroup("all"); }} onGroupChange={setPublishedGroup} onQueryChange={setPublishedQuery} onOpen={setRecordEditor} />,
    entry: <DataCenterWorkspace mode="entry" onChanged={loadAdmin} renderEntry={(reference, reload) => <CatalogDraftWorkspace reference={reference} onCreated={reload} />} />,
    review: <ReviewWorkspace queues={adminData.queues} role={adminData.profile.role} workingId={workingId} statusLabels={queueStatusLabels} onOpenRecord={setRecordEditor} onSetStatus={setReviewStatus} onProcessRights={processRightsRequest} onDeleteRecord={deleteCatalogRecord} />,
    partners: <PartnerReviewQueue />,
    media: <MediaVaultWorkspace onOpen={setRecordEditor} onUnauthorized={() => { setAdminData(null); setAdminState("signed_out"); }} />,
    imports: <DataCenterWorkspace mode="imports" onChanged={loadAdmin} />,
    search: <SearchGovernanceWorkspace terms={adminData.searchGovernance.terms} visibleTerms={visibleSearchTerms} weakQueries={adminData.searchGovernance.weakQueries} activeTerms={adminData.searchGovernance.activeTerms} draftTerms={adminData.searchGovernance.draftTerms} totalEventsReviewed={adminData.searchGovernance.totalEventsReviewed} workingId={workingId} view={searchTermView} query={searchTermQuery} letter={searchLetter} letters={arabicLetters} editingTermId={editingSearchTermId} intentLabels={searchIntentLabels} typeLabels={searchTypeLabels} onCreate={createSearchTerm} onViewChange={setSearchTermView} onQueryChange={setSearchTermQuery} onLetterChange={setSearchLetter} onEdit={setEditingSearchTermId} onStatusChange={setSearchTermStatus} onDelete={deleteSearchTerm} renderEditingTerm={(term) => <SearchTermEditForm key={term.id} term={term} onCancel={() => setEditingSearchTermId("")} onSaved={(result) => { setAdminData((current) => current ? adoptAdminPayload(current, result) : current); setEditingSearchTermId(""); setAdminMessage("تم تعديل مصطلح البحث وتسجيل التغيير."); }} />} />,
    requests: <SupportWorkspace data={adminData.supportWorkspace} canDelete={adminData.profile.role === "admin"} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />,
    archive: <ArchiveWorkspace items={adminData.inactiveCatalog} role={adminData.profile.role} workingId={workingId} onOpen={setRecordEditor} onRestoreDraft={(entity, id) => void setReviewStatus(entity, id, "draft")} onDelete={deleteCatalogRecord} importArchive={<ArchivedImportBatches />} />,
    taxonomy: <TaxonomyWorkspace />,
  } satisfies Partial<Record<OperationsWorkspaceId, React.ReactNode>>;

  return <>
    {adminMessage && <div className="operations-global-message"><p className="admin-message" role="status">{adminMessage}</p></div>}
    <OperationsWorkspaceShell workspace={workspace} onWorkspaceChange={setWorkspace} panels={panels} canManageTaxonomy={adminData.profile.role === "admin"} operatorLabel={adminData.profile.display_name || "فريق البيانات"} operatorRoleLabel={roleLabels[adminData.profile.role]} onLogout={logout} />
    {recordEditor && <ReviewRecordEditor entity={recordEditor.entity} id={recordEditor.id} canRestore={["verifier", "admin"].includes(adminData.profile.role)} onClose={() => setRecordEditor(null)} onSaved={loadAdmin} />}
    {qualityIssueEditor && <QualityIssueEditor issue={qualityIssueEditor} candidates={qualityRecordCandidates} canDecide={["verifier", "admin"].includes(adminData.profile.role)} onClose={() => setQualityIssueEditor(null)} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />}
  </>;
}
