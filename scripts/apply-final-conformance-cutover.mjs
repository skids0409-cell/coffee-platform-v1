import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

// Media Vault API: attach server-authoritative lifecycle actions to every asset.
{
  const path = "app/api/admin/media-vault/route.ts";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { adminRest } from "@/lib/supabase-admin";',
    'import { adminRest } from "@/lib/supabase-admin";\nimport { projectMediaVaultLifecycle } from "@/lib/media-vault-lifecycle-projection";',
    "media lifecycle import");
  s = replaceRequired(s,
    '    const activeLinks = (asset: VaultAsset) => (asset.links || []).filter((link) => ["active", "pending"].includes(link.link_status));',
    '    const activeLinks = (asset: VaultAsset) => (asset.links || []).filter((link) => ["active", "pending"].includes(link.link_status));\n    const dependentDuplicateParents = new Set(assets.map((asset) => asset.duplicate_of_asset_id).filter(Boolean));\n    const projectedAssets = hydrated.map((asset) => ({\n      ...asset,\n      lifecycle: projectMediaVaultLifecycle({\n        role: admin.profile.role,\n        lifecycleState: String(asset.lifecycle_state || "pending_approval"),\n        publicationStatus: asset.publication_status,\n        legalHold: asset.legal_hold,\n        retentionDaysRemaining: asset.retention_days_remaining ?? null,\n        hasActiveLinks: activeLinks(asset).length > 0,\n        hasDependentDuplicates: dependentDuplicateParents.has(asset.id),\n        purgeRequestId: asset.purge_request_id ?? null,\n        purgeRequestStatus: asset.purge_request_status ?? null,\n      }),\n    }));',
    "media lifecycle projection");
  s = replaceRequired(s,
    '      assets: hydrated,',
    '      assets: projectedAssets,',
    "media projected assets response");
  writeFileSync(path, s);
}

// Preservation API: send explicit server-projected capabilities.
{
  const path = "app/api/admin/preservation/route.ts";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { mediaRpc } from "@/lib/media-vault";',
    'import { mediaRpc } from "@/lib/media-vault";\nimport { projectPreservationCapabilities } from "@/lib/preservation-capabilities-projection";',
    "preservation capability import");
  s = replaceRequired(s,
    '    return Response.json({ authenticated: true, role: admin.profile.role, packages, summary: { aipCount, dipCount, failedFixity } }, { headers: { "cache-control": "no-store" } });',
    '    return Response.json({ authenticated: true, role: admin.profile.role, capabilities: projectPreservationCapabilities(admin.profile.role), packages, summary: { aipCount, dipCount, failedFixity } }, { headers: { "cache-control": "no-store" } });',
    "preservation capability response");
  writeFileSync(path, s);
}

// Preservation UI: consume the projected capability contract instead of role inference.
{
  const path = "app/ui/admin/governance/MediaPreservationProjection.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { GovernanceStatusSummary, LifecycleBadge, TransitionActionPanel } from "./GovernedWorkspace";',
    'import { GovernanceStatusSummary, LifecycleBadge, TransitionActionPanel } from "./GovernedWorkspace";\nimport type { PreservationCapabilitiesProjection } from "@/lib/preservation-capabilities-projection";',
    "preservation type import");
  s = replaceRequired(s,
    '  role?: string;\n  packages?: PreservationPackage[];',
    '  role?: string;\n  capabilities?: PreservationCapabilitiesProjection;\n  packages?: PreservationPackage[];',
    "preservation response capabilities");
  s = replaceRequired(s,
    '  role: string;\n  preservationSummary:',
    '  role: string;\n  capabilities: PreservationCapabilitiesProjection;\n  preservationSummary:',
    "projection capability type");
  s = replaceRequired(s,
    '    role: preservation.role || vaultRole || "",\n    preservationSummary:',
    '    role: preservation.role || vaultRole || "",\n    capabilities: preservation.capabilities || { contractRevision: "preservation.capabilities.v1", canCreateAip: false, canVerifyFixity: false, canCreateDip: false, blockedReason: "تعذر تحميل صلاحيات إجراءات الحفظ من الخادم." },\n    preservationSummary:',
    "projection capability hydrate");
  s = replaceRequired(s,
    'const ProjectionContext = createContext<ProjectionState | null>(null);',
    'const ProjectionContext = createContext<ProjectionState | null>(null);\nconst emptyPreservationCapabilities: PreservationCapabilitiesProjection = { contractRevision: "preservation.capabilities.v1", canCreateAip: false, canVerifyFixity: false, canCreateDip: false, blockedReason: "صلاحيات إجراءات الحفظ غير متاحة." };',
    "empty capabilities");
  s = replaceRequired(s,
    'const [data, setData] = useState<PreservationProjection>({ assets, packages: [], role, preservationSummary:',
    'const [data, setData] = useState<PreservationProjection>({ assets, packages: [], role, capabilities: emptyPreservationCapabilities, preservationSummary:',
    "initial capabilities");
  s = replaceRequired(s,
    '  const canOperate = ["verifier", "admin"].includes(data.role);',
    '  const capabilities = data.capabilities;',
    "remove preservation role inference");
  s = s.replace('      {!canOperate ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">العرض متاح؛ التنفيذ يتطلب verifier أو admin.</div> : null}',
    '      {capabilities.blockedReason ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{capabilities.blockedReason}</div> : null}');
  s = s.replaceAll('!canOperate || !selectedAsset', '!capabilities.canCreateAip || !selectedAsset');
  s = s.replaceAll('!canOperate || !latestAip || !/^[0-9a-f]{64}$/.test(observedSha256)', '!capabilities.canVerifyFixity || !latestAip || !/^[0-9a-f]{64}$/.test(observedSha256)');
  s = s.replaceAll('!canOperate || !latestAip || dipPurpose.trim().length < 5', '!capabilities.canCreateDip || !latestAip || dipPurpose.trim().length < 5');
  writeFileSync(path, s);
}

// Media Vault UI: no browser prompts and no role/state-derived action gates.
{
  const path = "app/ui/admin/MediaVaultWorkspace.tsx";
  let s = readFileSync(path, "utf8");
  s = replaceRequired(s,
    'import { MediaPreservationInspectorPanel, MediaPreservationProvider, MediaPreservationStatusStrip } from "@/app/ui/admin/governance/MediaPreservationProjection";',
    'import { MediaPreservationInspectorPanel, MediaPreservationProvider, MediaPreservationStatusStrip } from "@/app/ui/admin/governance/MediaPreservationProjection";\nimport { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport type { MediaVaultActionName, MediaVaultLifecycleAction, MediaVaultLifecycleProjection } from "@/lib/media-vault-lifecycle-projection";',
    "media ui imports");
  s = replaceRequired(s,
    '  purge_requests: PurgeRequest[];\n};',
    '  purge_requests: PurgeRequest[];\n  lifecycle: MediaVaultLifecycleProjection;\n};',
    "asset lifecycle type");
  s = replaceRequired(s,
    '  const [message, setMessage] = useState("");',
    '  const [message, setMessage] = useState("");\n  const [lifecycleRequest, setLifecycleRequest] = useState<{ action: MediaVaultLifecycleAction; assets: VaultAsset[] } | null>(null);\n  const [lifecycleBusy, setLifecycleBusy] = useState(false);',
    "media dialog state");
  const start = '  const selectedAssets = assets.filter((asset) => selected.includes(asset.id));';
  const end = '  const act = async (action: string, payload: Record<string, unknown> = {}) => {';
  const startIndex = s.indexOf(start);
  const endIndex = s.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) throw new Error("missing media action inference block");
  const replacement = `  const selectedAssets = assets.filter((asset) => selected.includes(asset.id));\n  const inspected = selectedAssets.length === 1 ? selectedAssets[0] : null;\n\n  const projectedSelectionAction = (name: MediaVaultActionName) => {\n    if (!selectedAssets.length) return null;\n    const actions = selectedAssets.map((asset) => asset.lifecycle.availableActions.find((item) => item.action === name)).filter(Boolean) as MediaVaultLifecycleAction[];\n    if (actions.length !== selectedAssets.length) return null;\n    const blocked = actions.find((action) => !action.enabled);\n    return { ...actions[0], enabled: !blocked, blockedReason: blocked?.blockedReason || null };\n  };\n\n  const requestProjectedAction = (name: MediaVaultActionName) => {\n    const action = projectedSelectionAction(name);\n    if (!action || !action.enabled) {\n      if (action?.blockedReason) setMessage(action.blockedReason);\n      return;\n    }\n    if (name === "execute_purge" && selectedAssets.length !== 1) {\n      setMessage("تنفيذ الإتلاف النهائي يتطلب تحديد أصل واحد فقط.");\n      return;\n    }\n    setLifecycleRequest({ action, assets: selectedAssets });\n  };\n\n`;
  s = s.slice(0, startIndex) + replacement + s.slice(endIndex);

  const promptStart = s.indexOf('  const requestQuarantine = async () => {');
  const toggleStart = s.indexOf('  const toggleSelected = (id: string) => {');
  if (promptStart < 0 || toggleStart < 0 || toggleStart <= promptStart) throw new Error("missing media prompt action block");
  const executeReplacement = `  const performProjectedAction = async (request: { action: MediaVaultLifecycleAction; assets: VaultAsset[] }, value: string) => {\n    const { action, assets: requestAssets } = request;\n    if (action.endpoint === "purge") {\n      if (!action.requestId || requestAssets.length !== 1) return false;\n      setWorking(true);\n      try {\n        const response = await fetch("/api/admin/media-vault/purge", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ requestId: action.requestId }) });\n        const result = await response.json().catch(() => ({}));\n        setMessage(response.ok ? "تم تنفيذ الإتلاف النهائي مع حفظ سجل التدقيق." : \`تعذر تنفيذ الإتلاف النهائي: \${String(result.reason || "خطأ")}\`);\n        if (!response.ok) return false;\n        setSelected([]);\n        await load();\n        return true;\n      } finally { setWorking(false); }\n    }\n    const payload = action.action === "quarantine" || action.action === "request_purge"\n      ? { reason: value.trim() }\n      : action.action === "approve_purge" || action.action === "reject_purge"\n        ? { review_note: value.trim() }\n        : {};\n    return act(action.action, payload).then(() => true);\n  };\n\n`;
  s = s.slice(0, promptStart) + executeReplacement + s.slice(toggleStart);

  const actionsStart = '              <div className="flex flex-wrap gap-2">\n                <button className="secondary" disabled={working || !hasActiveLinks || role !== "admin"}';
  const actionsEnd = '              </div>\n            </div>\n            {(quarantineBlockers.length > 0 || disposalBlockers.length > 0)';
  const ai = s.indexOf(actionsStart);
  const ae = s.indexOf(actionsEnd);
  if (ai < 0 || ae < 0 || ae <= ai) throw new Error("missing media buttons block");
  const actionNames = `["unlink", "quarantine", "request_purge", ...(queue === "disposal" ? ["approve_purge", "reject_purge", "execute_purge"] : [])] as MediaVaultActionName[]`;
  const buttons = `              <div className="flex flex-wrap gap-2">\n                {(${actionNames}).map((name) => {\n                  const action = projectedSelectionAction(name);\n                  if (!action) return null;\n                  return <button key={name} className="secondary" disabled={working || !action.enabled || (name === "execute_purge" && selectedAssets.length !== 1)} title={action.blockedReason || undefined} data-lifecycle-revision={selectedAssets[0]?.lifecycle.contractRevision} onClick={() => requestProjectedAction(name)}>{action.label}</button>;\n                })}\n              </div>\n            </div>\n            {selectedAssets.some((asset) => asset.lifecycle.availableActions.some((action) => !action.enabled && action.blockedReason))`;
  s = s.slice(0, ai) + buttons + s.slice(ae + actionsEnd.length);
  s = replaceRequired(s,
    '              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">\n                {[...new Set([...quarantineBlockers, ...disposalBlockers])].join(" ")}\n              </div>',
    '              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">\n                {[...new Set(selectedAssets.flatMap((asset) => asset.lifecycle.availableActions.map((action) => action.blockedReason).filter(Boolean)))].join(" ")}\n              </div>',
    "media blockers presentation");

  const finalMarker = '      </section>\n    </MediaPreservationProvider>';
  const dialog = `      </section>\n      <StandardConfirmDialog\n        open={Boolean(lifecycleRequest)}\n        title={lifecycleRequest?.action.confirmation.title || ""}\n        description={lifecycleRequest?.action.confirmation.description || ""}\n        confirmLabel={lifecycleRequest?.action.confirmation.confirmLabel || "تأكيد"}\n        tone={lifecycleRequest?.action.confirmation.tone}\n        input={lifecycleRequest?.action.confirmation.input}\n        busy={lifecycleBusy}\n        onCancel={() => { if (!lifecycleBusy) setLifecycleRequest(null); }}\n        onConfirm={async (value) => {\n          if (!lifecycleRequest) return;\n          setLifecycleBusy(true);\n          try { const ok = await performProjectedAction(lifecycleRequest, value); if (ok) setLifecycleRequest(null); }\n          finally { setLifecycleBusy(false); }\n        }}\n      />\n    </MediaPreservationProvider>`;
  s = replaceRequired(s, finalMarker, dialog, "media standard dialog");
  writeFileSync(path, s);
}

console.log("Final conformance cutover applied");
