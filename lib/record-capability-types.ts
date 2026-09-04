export const PRODUCT_KINDS = [
  "roasted_coffee",
  "equipment",
  "consumable",
  "care_product",
  "replacement_part",
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];
export type RecordMode = "create" | "edit" | "review";

export type CapabilityCategory = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  navigation_parent_id: string | null;
  family_id: string | null;
  filter_id: string | null;
  canonical_path_ids: string[];
  product_kind: ProductKind;
  assignable: true;
  publicly_visible: boolean;
  operationally_visible: true;
};

export type CapabilityFamily = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
};

export type CapabilityAttribute = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  data_type: string;
  unit_code: string | null;
  allowed_values: string[];
  validation_rules: Record<string, unknown>;
  missing_value_policy: string;
  is_multi_value: boolean;
  is_required_for_publish: boolean;
  sort_order: number;
  origin_category_id: string;
};

export type RecordCapabilityContract = {
  contract_version: "phase2.v1";
  contract_revision: string;
  generated_at: string;
  entity_types: readonly ["product", "offer", "brand", "organization", "content", "origin"];
  product_kinds: typeof PRODUCT_KINDS;
  entity_type: "product";
  mode: RecordMode;
  product_kind: ProductKind;
  record_id: string | null;
  record_state: "new" | "valid" | "legacy_conflict" | "archived";
  selection_policy: {
    shape: "direct_category" | "family_then_category";
    family_required: boolean;
    product_kind_immutable: true;
  };
  families: CapabilityFamily[];
  categories: CapabilityCategory[];
  attributes_by_category: Record<string, CapabilityAttribute[]>;
  allowed_brand_ids: string[];
  validation_schema: {
    category_must_match_product_kind: true;
    unknown_attributes_rejected: true;
    stale_revision_status: 409;
    atomic_product_write: true;
  };
  state_rules: {
    create: readonly ["kind_selected", "category_selected", "form_valid", "draft_created"];
    edit: readonly ["loaded_valid", "dirty_valid", "saved"];
    legacy: readonly ["loaded_legacy_conflict", "safe_fields_only", "reclassification_required"];
  };
  legacy_conflicts: string[];
};

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === "string" && (PRODUCT_KINDS as readonly string[]).includes(value);
}
