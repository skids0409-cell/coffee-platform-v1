import fs from 'node:fs';

function replaceOnce(path, from, to) {
  const src = fs.readFileSync(path, 'utf8');
  if (!src.includes(from)) throw new Error(`marker not found in ${path}: ${from.slice(0,120)}`);
  fs.writeFileSync(path, src.replace(from, to));
}

const ui = 'app/ui/admin/PendingAssetReviewConsole.tsx';
replaceOnce(ui,
  'import type { PendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";\n',
  'import type { PendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";\nimport { ContextualEntitySelector, type ResolvedEntityTarget } from "@/app/ui/admin/ContextualEntitySelector";\n'
);
replaceOnce(ui,
`const entityLabels: Record<string, string> = {
  products: "منتج",
  offers: "عرض",
  organizations: "جهة",
  brands: "علامة تجارية",
  contents: "محتوى",
  origin_claims: "مصدر قهوة",
};

`, '');
replaceOnce(ui,
`  const [entityType, setEntityType] = useState("products");
  const [entityId, setEntityId] = useState("");
`,
`  const [entityTarget, setEntityTarget] = useState<ResolvedEntityTarget | null>(null);
`);
replaceOnce(ui,
`    setSelectedId(asset.id);
    setAltAr("");
`,
`    setSelectedId(asset.id);
    setEntityTarget(null);
    setAltAr("");
`);
replaceOnce(ui,
`      if (!/^[0-9a-f-]{36}$/i.test(entityId.trim())) {
        setMessage("أدخل معرف UUID صحيحاً للسجل المستهدف قبل الاعتماد والإسناد.");
        return;
      }
`,
`      if (!entityTarget) {
        setMessage("اختر السجل المستهدف من الباحث السياقي المعتمد قبل الاعتماد والإسناد.");
        return;
      }
`);
replaceOnce(ui,
`            ? { entity_type: entityType, entity_id: entityId.trim(), role: linkRole, alt_ar: effectiveAltAr }
`,
`            ? { entity_type: entityTarget?.entityType, entity_id: entityTarget?.id, role: linkRole, alt_ar: effectiveAltAr }
`);
replaceOnce(ui, '      setEntityId("");\n', '      setEntityTarget(null);\n');
replaceOnce(ui,
`                  <label className="block text-sm">نوع السجل<select className="mt-1 w-full rounded-md border p-2" value={entityType} onChange={(event) => setEntityType(event.target.value)}>{Object.entries(entityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="mt-2 block text-sm">معرف السجل المستهدف<input className="mt-1 w-full rounded-md border p-2" value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="UUID" /></label>
`,
`                  <ContextualEntitySelector context="media_pending_review" role={linkRole} value={entityTarget} onChange={setEntityTarget} disabled={working || !capabilities.canDecide} />
`);

const route = 'app/api/admin/media-vault/review/route.ts';
replaceOnce(route,
  'import { projectPendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";\n',
  'import { projectPendingAssetReviewCapabilities } from "@/lib/pending-asset-review-capabilities";\nimport { isEntityTypeAllowed, projectEntityLinkingContract } from "@/lib/entity-linking-contract";\n'
);
replaceOnce(route,
  'const ENTITY_TYPES = new Set(["organizations", "brands", "products", "offers", "contents", "origin_claims"]);\n',
  ''
);
replaceOnce(route,
`    if (!ENTITY_TYPES.has(entityType) || !UUID.test(entityId) || !LINK_ROLES.has(linkRole) || altAr.length < 2) {
      return Response.json({ updated: false, reason: "invalid_assignment" }, { status: 400 });
    }
`,
`    const linkingContract = projectEntityLinkingContract({ context: "media_pending_review", linkRole });
    if (!LINK_ROLES.has(linkRole) || !isEntityTypeAllowed(linkingContract, entityType) || !UUID.test(entityId) || altAr.length < 2) {
      return Response.json({ updated: false, reason: "invalid_assignment" }, { status: 400 });
    }
`);

console.log('operations resolver cutover applied');
