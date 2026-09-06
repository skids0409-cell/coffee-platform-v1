export const ENTITY_LINKING_CONTRACT_REVISION = "media-linking.contract.v1" as const;

export type EntityResolverContext = "media_pending_review" | "support_technical_reference";

export type EntityLinkRole = "primary" | "gallery" | "logo" | "hero" | "evidence" | "document";

export type EntityTypeKey = "products" | "offers" | "organizations" | "brands" | "contents" | "origin_claims";

export type EntityTypeProjection = {
  entityType: EntityTypeKey;
  label: string;
};

export type EntityLinkingProjection = {
  contractRevision: typeof ENTITY_LINKING_CONTRACT_REVISION;
  context: EntityResolverContext;
  linkRole: EntityLinkRole | null;
  allowedEntityTypes: EntityTypeProjection[];
  manualIdentifiersAllowed: false;
  selectionMode: "server_resolved";
};

const labels: Record<EntityTypeKey, string> = {
  products: "منتج",
  offers: "عرض",
  organizations: "جهة",
  brands: "علامة تجارية",
  contents: "محتوى",
  origin_claims: "مصدر قهوة",
};

const mediaTypesByRole: Record<EntityLinkRole, EntityTypeKey[]> = {
  primary: ["products", "offers", "contents"],
  gallery: ["products", "offers", "contents"],
  logo: ["organizations", "brands"],
  hero: ["products", "contents", "organizations"],
  evidence: ["products", "offers", "organizations", "contents", "origin_claims"],
  document: ["products", "offers", "organizations", "contents", "origin_claims"],
};

export function projectEntityLinkingContract(input: {
  context: EntityResolverContext;
  linkRole?: string | null;
}): EntityLinkingProjection {
  const role = input.linkRole && input.linkRole in mediaTypesByRole
    ? input.linkRole as EntityLinkRole
    : null;

  const entityTypes: EntityTypeKey[] = input.context === "media_pending_review"
    ? (role ? mediaTypesByRole[role] : [...new Set(Object.values(mediaTypesByRole).flat())])
    : ["products", "offers", "organizations", "brands", "contents", "origin_claims"];

  return {
    contractRevision: ENTITY_LINKING_CONTRACT_REVISION,
    context: input.context,
    linkRole: role,
    allowedEntityTypes: entityTypes.map((entityType) => ({ entityType, label: labels[entityType] })),
    manualIdentifiersAllowed: false,
    selectionMode: "server_resolved",
  };
}

export function isEntityTypeAllowed(projection: EntityLinkingProjection, entityType: string): entityType is EntityTypeKey {
  return projection.allowedEntityTypes.some((item) => item.entityType === entityType);
}
