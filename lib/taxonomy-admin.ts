export const taxonomyStatuses = ["draft", "in_review", "published", "archived", "rejected"] as const;
export const taxonomyDataTypes = ["text", "integer", "decimal", "boolean", "date", "enum", "multi_enum", "reference", "json"] as const;
export const taxonomyOperators = ["equals", "in", "range", "contains", "exists"] as const;
export const missingValuePolicies = ["block_publish", "lower_confidence", "show_unknown", "hide"] as const;

export type TaxonomyStatus = (typeof taxonomyStatuses)[number];
export type TaxonomyDataType = (typeof taxonomyDataTypes)[number];
export type TaxonomyOperator = (typeof taxonomyOperators)[number];

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categoryCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const fieldCodePattern = /^[a-z][a-z0-9_]*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const bool = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;

const integer = (value: unknown, fallback = 0) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) ? number : fallback;
};

const idOrNull = (value: unknown) => {
  const id = text(value, 36);
  return id && uuidPattern.test(id) ? id : null;
};

const timestampOrNull = (value: unknown) => {
  const timestamp = text(value, 80);
  return timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null;
};

export class TaxonomyInputError extends Error {
  reason: string;

  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

export function categoryPayload(value: unknown) {
  const input = record(value);
  if (!input) throw new TaxonomyInputError("invalid_category");
  const code = text(input.code, 80);
  const slug = text(input.slug, 120);
  const nameAr = text(input.name_ar, 160);
  const nameEn = text(input.name_en, 160);
  const phase = text(input.phase, 40) || "V1";
  if (!categoryCodePattern.test(code) || !slugPattern.test(slug)
      || nameAr.length < 2 || nameEn.length < 2
      || !["V1", "Phase 2 Professional"].includes(phase)) {
    throw new TaxonomyInputError("invalid_category");
  }
  return {
    code,
    parent_id: idOrNull(input.parent_id),
    slug,
    name_ar: nameAr,
    name_en: nameEn,
    description_ar: text(input.description_ar, 4000) || null,
    description_en: text(input.description_en, 4000) || null,
    sort_order: Math.max(0, integer(input.sort_order)),
    comparison_group: text(input.comparison_group, 120) || null,
    phase,
    is_filterable: bool(input.is_filterable, true),
  };
}

export function fieldPayload(value: unknown) {
  const input = record(value);
  if (!input) throw new TaxonomyInputError("invalid_field");
  const code = text(input.code, 100);
  const nameAr = text(input.name_ar, 160);
  const nameEn = text(input.name_en, 160);
  const dataType = text(input.data_type, 30) as TaxonomyDataType;
  const missingPolicy = text(input.missing_value_policy, 40) || "hide";
  const allowedValues = Array.isArray(input.allowed_values)
    ? input.allowed_values.map((item) => text(item, 200)).filter(Boolean)
    : [];
  const uniqueValues = [...new Set(allowedValues)];
  const validationRules = record(input.validation_rules) || {};
  if (!fieldCodePattern.test(code) || nameAr.length < 2 || nameEn.length < 2
      || !taxonomyDataTypes.includes(dataType)
      || !missingValuePolicies.includes(missingPolicy as typeof missingValuePolicies[number])
      || uniqueValues.length !== allowedValues.length || uniqueValues.length > 200) {
    throw new TaxonomyInputError("invalid_field");
  }
  return {
    code,
    name_ar: nameAr,
    name_en: nameEn,
    data_type: dataType,
    unit_code: text(input.unit_code, 40) || null,
    allowed_values: uniqueValues,
    validation_rules: validationRules,
    missing_value_policy: missingPolicy,
    is_searchable: bool(input.is_searchable),
    is_comparable: bool(input.is_comparable),
    is_recommendation_input: bool(input.is_recommendation_input),
    is_multi_value: dataType === "multi_enum" || bool(input.is_multi_value),
  };
}

export function filterPayload(value: unknown) {
  if (!Array.isArray(value) || value.length > 200)
    throw new TaxonomyInputError("invalid_filters");
  const rows = value.map((item) => {
    const input = record(item);
    const fieldId = idOrNull(input?.field_definition_id);
    const operator = text(input?.operator, 20) as TaxonomyOperator;
    const visible = bool(input?.is_visible, true);
    const required = bool(input?.is_required_for_publish);
    if (!fieldId || !taxonomyOperators.includes(operator) || (required && !visible))
      throw new TaxonomyInputError("invalid_filters");
    return {
      field_definition_id: fieldId,
      operator,
      sort_order: Math.max(0, integer(input?.sort_order)),
      is_visible: visible,
      is_required_for_publish: required,
    };
  });
  if (new Set(rows.map((row) => row.field_definition_id)).size !== rows.length)
    throw new TaxonomyInputError("duplicate_filter_fields");
  return rows;
}

export function requiredId(value: unknown, reason = "invalid_id") {
  const id = idOrNull(value);
  if (!id) throw new TaxonomyInputError(reason);
  return id;
}

export function requiredTimestamp(value: unknown) {
  const timestamp = timestampOrNull(value);
  if (!timestamp) throw new TaxonomyInputError("invalid_expected_updated_at");
  return timestamp;
}

export function transitionPayload(value: unknown) {
  const input = record(value);
  const entity = text(input?.entity, 20);
  const status = text(input?.status, 20) as TaxonomyStatus;
  const reason = text(input?.reason, 1000);
  if (!["category", "field", "filter"].includes(entity)
      || !taxonomyStatuses.includes(status) || reason.length < 10) {
    throw new TaxonomyInputError("invalid_transition");
  }
  return {
    entity,
    id: requiredId(input?.id),
    status,
    reason,
    expectedUpdatedAt: requiredTimestamp(input?.expectedUpdatedAt),
  };
}
