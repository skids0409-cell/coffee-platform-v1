"use client";

import { useEffect, useMemo, useState } from "react";
import type { EntityLinkingProjection, EntityResolverContext } from "@/lib/entity-linking-contract";

export type ResolvedEntityTarget = {
  entityType: string;
  id: string;
  label: string;
};

type ResolverOption = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  status: string | null;
};

type ResolverResponse = {
  contract?: EntityLinkingProjection;
  options?: ResolverOption[];
  reason?: string;
};

export function ContextualEntitySelector({
  context,
  role,
  value,
  onChange,
  disabled = false,
}: {
  context: EntityResolverContext;
  role?: string | null;
  value: ResolvedEntityTarget | null;
  onChange: (target: ResolvedEntityTarget | null) => void;
  disabled?: boolean;
}) {
  const [contract, setContract] = useState<EntityLinkingProjection | null>(null);
  const [entityType, setEntityType] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ResolverOption[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const params = new URLSearchParams({ context });
    if (role) params.set("role", role);
    fetch(`/api/admin/entity-resolver?${params.toString()}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as ResolverResponse;
        if (!response.ok || !result.contract) throw new Error(result.reason || "resolver_failed");
        if (cancelled) return;
        setContract(result.contract);
        const nextType = result.contract.allowedEntityTypes.some((item) => item.entityType === value?.entityType)
          ? String(value?.entityType || "")
          : result.contract.allowedEntityTypes[0]?.entityType || "";
        setEntityType(nextType);
        if (value && value.entityType !== nextType) onChange(null);
        setState("ready");
      })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [context, role]);

  useEffect(() => {
    if (!entityType || state !== "ready") return;
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ context, entityType, q: query.trim() });
      if (role) params.set("role", role);
      fetch(`/api/admin/entity-resolver?${params.toString()}`, { cache: "no-store", credentials: "same-origin" })
        .then(async (response) => {
          const result = (await response.json().catch(() => ({}))) as ResolverResponse;
          if (!response.ok) throw new Error(result.reason || "resolver_failed");
          setOptions(Array.isArray(result.options) ? result.options : []);
        })
        .catch(() => setOptions([]));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [context, entityType, query, role, state]);

  const selectedLabel = useMemo(() => value ? value.label : "", [value]);

  if (state === "loading") return <p className="text-xs text-[#756b63]">جارٍ تحميل خيارات الربط المعتمدة…</p>;
  if (state === "error" || !contract) return <p className="text-xs text-red-700">تعذر تحميل عقد الربط الخادمي.</p>;

  return (
    <div className="space-y-2" data-linking-contract={contract.contractRevision} data-manual-identifiers="false">
      <label className="block text-sm">
        نوع السجل
        <select
          className="mt-1 w-full rounded-md border p-2"
          value={entityType}
          disabled={disabled}
          onChange={(event) => {
            setEntityType(event.target.value);
            setQuery("");
            setOptions([]);
            onChange(null);
          }}
        >
          {contract.allowedEntityTypes.map((item) => <option key={item.entityType} value={item.entityType}>{item.label}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        البحث عن السجل
        <input
          className="mt-1 w-full rounded-md border p-2"
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
          }}
          placeholder="ابحث بالاسم أو العنوان"
          autoComplete="off"
        />
      </label>

      <div className="max-h-44 overflow-auto rounded-md border bg-white" role="listbox" aria-label="السجلات المتاحة للربط">
        {options.length ? options.map((option) => {
          const selected = value?.id === option.id && value.entityType === entityType;
          return (
            <button
              type="button"
              key={option.id}
              disabled={disabled}
              onClick={() => onChange({ entityType, id: option.id, label: option.label })}
              className={`block w-full border-b px-3 py-2 text-right last:border-b-0 ${selected ? "bg-emerald-50" : "bg-white hover:bg-[#fffaf3]"}`}
              role="option"
              aria-selected={selected}
            >
              <b className="block">{option.label}</b>
              <span className="block text-xs text-[#756b63]">{[option.secondaryLabel, option.status].filter(Boolean).join(" · ") || "سجل صالح للربط"}</span>
            </button>
          );
        }) : <p className="p-3 text-xs text-[#756b63]">لا توجد نتائج مطابقة ضمن السياق المسموح.</p>}
      </div>

      {value && <p className="rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">سيتم الربط مع: <b>{selectedLabel}</b></p>}
    </div>
  );
}
