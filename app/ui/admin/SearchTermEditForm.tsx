"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";

export function SearchTermEditForm({ term, onCancel, onSaved }: { term: any; onCancel: () => void; onSaved: (result: any) => void }) {
  const [message, setMessage] = useState("");

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (term.status === "active" && !window.confirm("سيؤثر هذا التعديل فوراً في نتائج البحث. هل راجعت المصطلح والمرادفات والنطاق؟")) return;
    const form = new FormData(event.currentTarget);
    setMessage("جارٍ الحفظ…");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_search_term",
        id: term.id,
        canonicalTermAr: form.get("canonicalTermAr"),
        canonicalTermEn: form.get("canonicalTermEn"),
        aliases: String(form.get("aliases") || "").split(/[،,]/).map((value) => value.trim()).filter(Boolean),
        intent: form.get("intent"),
        entityScope: form.getAll("entityScope"),
        matchMode: form.get("matchMode"),
        weight: Number(form.get("weight")),
        sourceBasis: form.get("sourceBasis"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage("تعذر حفظ التعديل؛ تحقق من عدم تكرار المصطلح والحقول المطلوبة.");
      return;
    }
    onSaved(result);
  };

  return <form className="search-term-form editing" onSubmit={save} data-governed-inspector="true">
    {message && <p className="admin-message wide">{message}</p>}
    <label>المصطلح العربي<input name="canonicalTermAr" defaultValue={term.canonical_term_ar} required /></label>
    <label>الإنجليزي<input name="canonicalTermEn" defaultValue={term.canonical_term_en || ""} /></label>
    <label className="wide">المرادفات<input name="aliases" defaultValue={term.aliases.join("، ")} /></label>
    <label>المقصد<select name="intent" defaultValue={term.intent}><option value="broad">بحث عام</option><option value="product">منتج</option><option value="organization">جهة</option><option value="origin">مصدر قهوة</option><option value="content">معرفة</option></select></label>
    <label>طريقة المطابقة<select name="matchMode" defaultValue={term.match_mode}><option value="exact">تطابق تام</option><option value="prefix">بداية الكلمة</option><option value="contains">يحتوي</option></select></label>
    <label>درجة الأولوية (1–100)<input name="weight" type="number" min="1" max="100" defaultValue={term.weight} /><small>درجة ترتيب وليست وزناً بالغم.</small></label>
    <label>أساس المصدر<select name="sourceBasis" defaultValue={term.source_basis}><option value="observed_query">ظهر في بحث المستخدمين</option><option value="platform_decision">قرار تحريري للمنصة</option><option value="industry_reference">مرجع معتمد في القطاع</option></select></label>
    <fieldset className="search-scope wide"><legend>نطاق النتائج</legend>{[["product", "المنتجات"], ["organization", "الجهات"], ["content", "المعرفة"], ["origin", "المصادر"]].map(([value, label]) => <label key={value}><input type="checkbox" name="entityScope" value={value} defaultChecked={term.entity_scope.includes(value)} /> {label}</label>)}</fieldset>
    <div className="queue-actions wide"><button type="submit">حفظ التعديل</button><button type="button" onClick={onCancel}>إلغاء</button></div>
  </form>;
}
