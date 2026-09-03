import { adminRest } from "@/lib/supabase-admin";
import {
  PRODUCT_KINDS,
  type CapabilityAttribute,
  type ProductKind,
  type RecordCapabilityContract,
  type RecordMode,
} from "@/lib/record-capability-types";

type CategoryRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  parent_id: string | null;
  navigation_parent_id: string | null;
  is_navigation_visible: boolean;
  catalog_family_id: string | null;
  catalog_filter_id: string | null;
  catalog_product_kind: string | null;
};

type FilterRow = {
  category_id: string;
  sort_order: number;
  is_required_for_publish: boolean;
  field_definitions: {
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
  };
};

type BrandRow = { id: string; brand_product_kinds: Array<{ product_kind: string }> };
type ProductRow = { id: string; product_kind: string; status: string; product_categories: Array<{ category_id: string; is_primary: boolean }> };

const entityTypes = ["product", "offer", "brand", "organization", "content", "origin"] as const;

function canonicalPath(category: CategoryRow, byId: Map<string, CategoryRow>) {
  const path: string[] = [];
  const visited = new Set<string>();
  let current: CategoryRow | undefined = category;
  while (current && !visited.has(current.id)) {
    path.unshift(current.id);
    visited.add(current.id);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

function effectiveAttributes(category: CategoryRow, filters: FilterRow[]) {
  const sourceIds = [category.id, category.catalog_filter_id, category.catalog_family_id].filter((id, index, all): id is string => Boolean(id) && all.indexOf(id) === index);
  const effective = new Map<string, CapabilityAttribute>();
  for (const sourceId of sourceIds) {
    for (const rule of filters.filter((item) => item.category_id === sourceId)) {
      const field = rule.field_definitions;
      if (!effective.has(field.id)) effective.set(field.id, {
        ...field,
        allowed_values: Array.isArray(field.allowed_values) ? field.allowed_values : [],
        validation_rules: field.validation_rules || {},
        is_required_for_publish: rule.is_required_for_publish,
        sort_order: rule.sort_order,
        origin_category_id: sourceId,
      });
    }
  }
  return [...effective.values()].sort((left, right) => left.sort_order - right.sort_order || left.code.localeCompare(right.code));
}

export async function loadRecordCapability(
  token: string,
  productKind: ProductKind,
  mode: RecordMode,
  recordId?: string | null,
): Promise<RecordCapabilityContract> {
  const [revision, categories, filters, brands, records] = await Promise.all([
    adminRest<string>(token, "rpc/admin_record_contract_revision", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }),
    adminRest<CategoryRow[]>(token, "categories?select=id,code,name_ar,name_en,parent_id,navigation_parent_id,is_navigation_visible,catalog_family_id,catalog_filter_id,catalog_product_kind&status=eq.published&order=sort_order.asc,code.asc&limit=500"),
    adminRest<FilterRow[]>(token, "filter_definitions?select=category_id,sort_order,is_required_for_publish,field_definitions(id,code,name_ar,name_en,data_type,unit_code,allowed_values,validation_rules,missing_value_policy,is_multi_value)&status=eq.published&field_definitions.status=eq.published&order=sort_order.asc"),
    adminRest<BrandRow[]>(token, "brands?select=id,brand_product_kinds(product_kind)&status=eq.published&order=name_ar.asc&limit=500"),
    recordId ? adminRest<ProductRow[]>(token, `products?select=id,product_kind,status,product_categories(category_id,is_primary)&id=eq.${recordId}&limit=1`) : Promise.resolve([]),
  ]);

  const record = records[0];
  const effectiveKind = record?.product_kind;
  if (effectiveKind && effectiveKind !== productKind) throw new Error("record_kind_mismatch");
  const byId = new Map(categories.map((category) => [category.id, category]));
  const eligible = categories.filter((category) => category.catalog_product_kind === productKind);
  const familyIds = [...new Set(eligible.map((category) => category.catalog_family_id).filter((id): id is string => Boolean(id)))];
  const primaryCategoryId = record?.product_categories.find((link) => link.is_primary)?.category_id || record?.product_categories[0]?.category_id || null;
  const categoryValid = !record || eligible.some((category) => category.id === primaryCategoryId);
  const recordState = !record ? "new" : record.status === "archived" ? "archived" : categoryValid ? "valid" : "legacy_conflict";
  const attributeMap = Object.fromEntries(eligible.map((category) => [category.id, effectiveAttributes(category, filters)]));

  return {
    contract_version: "phase2.v1",
    contract_revision: revision,
    generated_at: new Date().toISOString(),
    entity_types: entityTypes,
    product_kinds: PRODUCT_KINDS,
    entity_type: "product",
    mode,
    product_kind: productKind,
    record_id: record?.id || null,
    record_state: recordState,
    selection_policy: {
      shape: productKind === "equipment" ? "family_then_category" : "direct_category",
      family_required: productKind === "equipment",
      product_kind_immutable: true,
    },
    families: familyIds.flatMap((id) => {
      const category = byId.get(id);
      return category ? [{ id, code: category.code, name_ar: category.name_ar, name_en: category.name_en }] : [];
    }),
    categories: eligible.map((category) => ({
      id: category.id,
      code: category.code,
      name_ar: category.name_ar,
      name_en: category.name_en,
      parent_id: category.parent_id,
      navigation_parent_id: category.navigation_parent_id,
      family_id: category.catalog_family_id,
      filter_id: category.catalog_filter_id,
      canonical_path_ids: canonicalPath(category, byId),
      product_kind: productKind,
      assignable: true,
      publicly_visible: category.is_navigation_visible,
      operationally_visible: true,
    })),
    attributes_by_category: attributeMap,
    allowed_brand_ids: brands.filter((brand) => !brand.brand_product_kinds.length || brand.brand_product_kinds.some((item) => item.product_kind === productKind)).map((brand) => brand.id),
    validation_schema: {
      category_must_match_product_kind: true,
      unknown_attributes_rejected: true,
      stale_revision_status: 409,
      atomic_product_write: true,
    },
    state_rules: {
      create: ["kind_selected", "category_selected", "form_valid", "draft_created"],
      edit: ["loaded_valid", "dirty_valid", "saved"],
      legacy: ["loaded_legacy_conflict", "safe_fields_only", "reclassification_required"],
    },
    legacy_conflicts: categoryValid ? [] : ["category_product_kind_mismatch"],
  };
}

export function serializeCapabilityAttributes(
  contract: RecordCapabilityContract,
  categoryId: string,
  submitted: Array<{ fieldId?: string; value?: unknown }>,
) {
  if (!contract.categories.some((category) => category.id === categoryId)) throw new Error("category_kind_mismatch");
  const definitions = new Map((contract.attributes_by_category[categoryId] || []).map((definition) => [definition.id, definition]));
  return submitted.flatMap((attribute) => {
    const definition = definitions.get(String(attribute.fieldId || ""));
    const value = String(attribute.value ?? "").trim().slice(0, 2000);
    if (!value) return [];
    if (!definition) throw new Error("attribute_not_allowed");
    const row: Record<string, unknown> = { field_definition_id: definition.id, unit_code: definition.unit_code || null };
    if (definition.data_type === "integer") {
      if (!/^-?\d+$/.test(value)) throw new Error("invalid_attribute_value");
      row.value_integer = Number.parseInt(value, 10);
    } else if (definition.data_type === "decimal") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error("invalid_attribute_value");
      row.value_decimal = parsed;
    } else if (definition.data_type === "boolean") {
      if (!['true', 'false'].includes(value)) throw new Error("invalid_attribute_value");
      row.value_boolean = value === "true";
    } else if (definition.data_type === "date") row.value_date = value;
    else if (["multi_enum", "reference"].includes(definition.data_type)) {
      const values = value.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
      if (definition.data_type === "multi_enum" && definition.allowed_values.length && values.some((item) => !definition.allowed_values.includes(item))) throw new Error("invalid_attribute_value");
      row.value_json = values;
    } else if (definition.data_type === "json") {
      try { row.value_json = JSON.parse(value); } catch { throw new Error("invalid_attribute_value"); }
    } else {
      if (definition.data_type === "enum" && definition.allowed_values.length && !definition.allowed_values.includes(value)) throw new Error("invalid_attribute_value");
      row.value_text = value;
    }
    return [row];
  });
}
