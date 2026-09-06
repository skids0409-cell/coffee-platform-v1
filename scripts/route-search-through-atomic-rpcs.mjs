import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");

const replaceBetween = (startMarker, endMarker, replacement, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error(`missing ${label} markers`);
  source = source.slice(0, start) + replacement + source.slice(end);
};

replaceBetween(
  '  if (body?.action === "create_search_term") {',
  '  if (body?.action === "set_search_term_status") {',
`  if (body?.action === "create_search_term") {
    const canonicalTermAr = String(body.canonicalTermAr || "").trim().slice(0, 120);
    const canonicalTermEn = String(body.canonicalTermEn || "").trim().slice(0, 120) || null;
    const normalizedTerm = normalizeSearchText(canonicalTermAr);
    const intent = searchIntents.includes(body.intent as (typeof searchIntents)[number]) ? body.intent as (typeof searchIntents)[number] : null;
    const aliases = Array.isArray(body.aliases)
      ? body.aliases.map((alias) => String(alias).trim().slice(0, 120)).filter((alias, index, list) => alias.length >= 2 && list.indexOf(alias) === index).slice(0, 30)
      : [];
    const entityScope = Array.isArray(body.entityScope)
      ? body.entityScope.filter((type): type is SearchEntityType => searchEntityTypes.includes(type as SearchEntityType))
      : [];
    const matchMode = ["exact", "prefix", "contains"].includes(body.matchMode || "") ? body.matchMode! : "contains";
    const weight = Math.max(1, Math.min(100, Number(body.weight) || 50));
    const sourceBasis = searchSourceBases.includes(body.sourceBasis as (typeof searchSourceBases)[number]) ? body.sourceBasis! : "observed_query";
    if (normalizedTerm.length < 2 || !intent || entityScope.length < 1) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_create_search_term", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_canonical_term_ar: canonicalTermAr,
          p_canonical_term_en: canonicalTermEn,
          p_normalized_term: normalizedTerm,
          p_aliases: aliases,
          p_intent: intent,
          p_entity_scope: entityScope,
          p_match_mode: matchMode,
          p_weight: weight,
          p_source_basis: sourceBasis,
        }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("invalid_search_") || message.includes("invalid_match_mode") || message.includes("invalid_source_basis") || message.includes("invalid_weight")) {
        return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      }
      throw error;
    }
  }
`,
  "create_search_term",
);

replaceBetween(
  '  if (body?.action === "set_search_term_status") {',
  '  if (body?.action === "delete_search_term") {',
`  if (body?.action === "set_search_term_status") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !searchTermStatuses.includes(body.status || "")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    if (body.status === "active" && !canVerify) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
    try {
      await adminRest(admin.token, "rpc/admin_set_search_term_status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p_term_id: body.id, p_next_status: body.status }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("search_term_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("verifier_required")) return Response.json({ updated: false, reason: "verifier_required" }, { status: 403 });
      if (message.includes("search_status_unchanged")) return Response.json({ updated: false, reason: "status_unchanged" }, { status: 409 });
      if (message.includes("invalid_search_status")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      throw error;
    }
  }
`,
  "set_search_term_status",
);

replaceBetween(
  '  if (body?.action === "delete_search_term") {',
  '  if (body?.action === "update_search_term") {',
`  if (body?.action === "delete_search_term") {
    if (!isOwnerAdmin) return Response.json({ updated: false, reason: "admin_required" }, { status: 403 });
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_delete_search_term", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ p_term_id: body.id }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("search_term_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("active_term_cannot_be_deleted")) return Response.json({ updated: false, reason: "active_term_cannot_be_deleted" }, { status: 409 });
      throw error;
    }
  }
`,
  "delete_search_term",
);

replaceBetween(
  '  if (body?.action === "update_search_term") {',
  '  if (body?.action === "update_support_request") {',
`  if (body?.action === "update_search_term") {
    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    const canonicalTermAr = String(body.canonicalTermAr || "").trim().slice(0, 120);
    const canonicalTermEn = String(body.canonicalTermEn || "").trim().slice(0, 120) || null;
    const normalizedTerm = normalizeSearchText(canonicalTermAr);
    const intent = searchIntents.includes(body.intent as (typeof searchIntents)[number]) ? body.intent as (typeof searchIntents)[number] : null;
    const aliases = Array.isArray(body.aliases) ? body.aliases.map((value) => String(value).trim().slice(0, 120)).filter((value, index, list) => value.length >= 2 && list.indexOf(value) === index).slice(0, 30) : [];
    const entityScope = Array.isArray(body.entityScope) ? body.entityScope.filter((value): value is SearchEntityType => searchEntityTypes.includes(value as SearchEntityType)) : [];
    const matchMode = ["exact", "prefix", "contains"].includes(body.matchMode || "") ? body.matchMode! : "contains";
    const weight = Math.max(1, Math.min(100, Number(body.weight) || 50));
    const sourceBasis = searchSourceBases.includes(body.sourceBasis as (typeof searchSourceBases)[number]) ? body.sourceBasis! : "observed_query";
    if (normalizedTerm.length < 2 || !intent || !entityScope.length) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
    try {
      await adminRest(admin.token, "rpc/admin_update_search_term", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          p_term_id: body.id,
          p_canonical_term_ar: canonicalTermAr,
          p_canonical_term_en: canonicalTermEn,
          p_normalized_term: normalizedTerm,
          p_aliases: aliases,
          p_intent: intent,
          p_entity_scope: entityScope,
          p_match_mode: matchMode,
          p_weight: weight,
          p_source_basis: sourceBasis,
        }),
      });
      return Response.json({ updated: true, ...(await loadQueue(admin.token)) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("search_term_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });
      if (message.includes("invalid_search_") || message.includes("invalid_match_mode") || message.includes("invalid_source_basis") || message.includes("invalid_weight")) {
        return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });
      }
      throw error;
    }
  }
`,
  "update_search_term",
);

writeFileSync(path, source);
console.log("search governance routed through atomic RPCs");
