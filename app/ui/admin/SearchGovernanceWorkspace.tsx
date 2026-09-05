"use client";

import type { ReactNode } from "react";
import type { SearchEntityType, SearchIntent } from "@/lib/search-governance";

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

type WeakQuery = {
  query: string;
  searches: number;
  zeroResults: number;
  lowResults: number;
  lastSearchedAt: string;
  inferredIntent: SearchIntent;
};

type SearchGovernanceWorkspaceProps = {
  terms: SearchTerm[];
  visibleTerms: SearchTerm[];
  weakQueries: WeakQuery[];
  activeTerms: number;
  draftTerms: number;
  totalEventsReviewed: number;
  workingId: string;
  view: "active" | "draft" | "retired" | "all";
  query: string;
  letter: string;
  letters: string[];
  editingTermId: string;
  intentLabels: Record<SearchIntent, string>;
  typeLabels: Record<SearchEntityType, string>;
  onCreate: (event: React.FormEvent<HTMLFormElement>) => void;
  onViewChange: (value: "active" | "draft" | "retired" | "all") => void;
  onQueryChange: (value: string) => void;
  onLetterChange: (value: string) => void;
  onEdit: (id: string) => void;
  onStatusChange: (id: string, next: "draft" | "active" | "retired") => void;
  onDelete: (id: string) => void;
  renderEditingTerm?: (term: SearchTerm) => ReactNode;
};

export function SearchGovernanceWorkspace({
  visibleTerms,
  weakQueries,
  activeTerms,
  draftTerms,
  totalEventsReviewed,
  workingId,
  view,
  query,
  letter,
  letters,
  editingTermId,
  intentLabels,
  typeLabels,
  onCreate,
  onViewChange,
  onQueryChange,
  onLetterChange,
  onEdit,
  onStatusChange,
  onDelete,
  renderEditingTerm,
}: SearchGovernanceWorkspaceProps) {
  return <div className="search-governance-disclosure" id="operations-search" data-workspace-contract="command-master-inspector-v1">
    <section className="search-governance-admin">
      <div className="section-head">
        <div><span className="eyebrow">Search Governance V1</span><h2>قاموس البحث وجودة النتائج</h2></div>
        <div className="search-governance-stats">
          <span><b>{activeTerms}</b> مصطلح فعال</span>
          <span><b>{draftTerms}</b> مسودة</span>
          <span><b>{totalEventsReviewed}</b> بحث محلل</span>
        </div>
      </div>
      <p>هذا القاموس يربط الكلمة بمرادفاتها ونوع النتائج المقصود. «درجة الأولوية» رقم من 1 إلى 100 لترتيب قاعدة البحث عند تعارض أكثر من مصطلح؛ ليست وزناً بالغم. القيمة المعتدلة الافتراضية 50.</p>

      <form className="search-term-form" onSubmit={onCreate}>
        <label>المصطلح العربي<input name="canonicalTermAr" minLength={2} maxLength={120} required placeholder="مثال: مطحنة يدوية" /></label>
        <label>المصطلح الإنجليزي<input name="canonicalTermEn" maxLength={120} placeholder="Manual grinder" /></label>
        <label className="wide">المرادفات، مفصولة بفاصلة<input name="aliases" maxLength={1000} placeholder="طاحونة يدوية، hand grinder" /></label>
        <label>المقصد<select name="intent" defaultValue="product"><option value="broad">بحث عام</option><option value="product">منتج</option><option value="organization">جهة</option><option value="origin">مصدر قهوة</option><option value="content">معرفة</option></select></label>
        <label>طريقة المطابقة<select name="matchMode" defaultValue="contains"><option value="contains">تحتوي الكلمة</option><option value="exact">تطابق تام</option><option value="prefix">تبدأ بالكلمة</option></select></label>
        <label>درجة الأولوية (1–100)<input name="weight" type="number" min="1" max="100" defaultValue="50" required /><small>50 عادية، ارفعها فقط للمصطلحات الأهم.</small></label>
        <label>مصدر المصطلح<select name="sourceBasis" defaultValue="observed_query"><option value="observed_query">ظهر في بحث المستخدمين</option><option value="platform_decision">قرار تحريري للمنصة</option><option value="industry_reference">مرجع معتمد في القطاع</option></select></label>
        <fieldset className="search-scope">
          <legend>الأقسام وترتيب الأولوية</legend>
          <label><input type="checkbox" name="entityScope" value="product" defaultChecked /> المنتجات</label>
          <label><input type="checkbox" name="entityScope" value="origin" /> المصادر</label>
          <label><input type="checkbox" name="entityScope" value="content" /> المعرفة</label>
          <label><input type="checkbox" name="entityScope" value="organization" /> الجهات</label>
        </fieldset>
        <button type="submit" disabled={workingId === "new-search-term"}>حفظ كمسودة</button>
      </form>

      <div className="search-term-toolbar">
        <div className="search-term-tabs">
          {(["active", "draft", "retired", "all"] as const).map((value) => <button type="button" key={value} className={view === value ? "active" : ""} onClick={() => onViewChange(value)}>{value === "active" ? "الفعالة" : value === "draft" ? "المسودات" : value === "retired" ? "المتوقفة" : "الكل"}</button>)}
        </div>
        <label>بحث داخل القاموس<input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="مصطلح أو مرادف" /></label>
      </div>

      <div className="arabic-letter-filter" aria-label="تصفية القاموس حسب الحرف">
        <button type="button" className={letter === "all" ? "active" : ""} onClick={() => onLetterChange("all")}>الكل</button>
        {letters.map((value) => <button type="button" key={value} className={letter === value ? "active" : ""} onClick={() => onLetterChange(value)}>{value}</button>)}
      </div>

      <div className="search-term-list" data-governed-master="true">
        {visibleTerms.map((term) => editingTermId === term.id && renderEditingTerm ? renderEditingTerm(term) : <article key={term.id}>
          <div>
            <div className="queue-title"><b>{term.canonical_term_ar}</b><span className={`search-term-status ${term.status}`}>{term.status === "active" ? "فعال" : term.status === "draft" ? "مسودة" : "متقاعد"}</span></div>
            <p>{term.canonical_term_en || "—"} · {intentLabels[term.intent]} · أولوية {term.weight}/100</p>
            <small>المرادفات: {term.aliases.join("، ") || "لا توجد"}</small>
            <small>النطاق: {term.entity_scope.map((type) => typeLabels[type]).join(" ← ")}</small>
          </div>
          <div className="queue-actions">
            <button type="button" onClick={() => onEdit(term.id)}>تعديل</button>
            {term.status !== "active" && <button type="button" disabled={workingId === term.id} onClick={() => onStatusChange(term.id, "active")}>تفعيل</button>}
            {term.status === "active" && <button type="button" disabled={workingId === term.id} onClick={() => onStatusChange(term.id, "retired")}>إيقاف</button>}
            {term.status === "retired" && <button type="button" disabled={workingId === term.id} onClick={() => onStatusChange(term.id, "draft")}>إعادة لمسودة</button>}
            {term.status !== "active" && <button type="button" className="danger-action" disabled={workingId === term.id} onClick={() => onDelete(term.id)}>حذف</button>}
          </div>
        </article>)}
        {!visibleTerms.length && <p>لا توجد مصطلحات مطابقة في هذا التبويب.</p>}
      </div>

      <div className="weak-query-report" data-governed-inspector="true">
        <h3>كلمات تحتاج إلى معالجة <span>{weakQueries.length}</span></h3>
        {weakQueries.length ? <div className="weak-query-table" role="table" aria-label="الكلمات ذات النتائج الضعيفة">
          <div role="row" className="head"><span>الكلمة</span><span>المقصد</span><span>بلا نتائج</span><span>نتيجة واحدة</span></div>
          {weakQueries.map((gap) => <div role="row" key={gap.query}><b>{gap.query}</b><span>{intentLabels[gap.inferredIntent]}</span><span>{gap.zeroResults}</span><span>{gap.lowResults}</span></div>)}
        </div> : <p>لا توجد كلمات ضعيفة مسجلة بعد. ستظهر هنا تلقائياً بعد الاختبارات.</p>}
      </div>
    </section>
  </div>;
}
