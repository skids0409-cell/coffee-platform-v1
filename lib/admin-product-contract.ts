export type ProductAttributeInput = {
  fieldId?: unknown;
  value?: unknown;
};

export type ProductFieldDefinition = {
  id: string;
  data_type: string;
  allowed_values?: string[] | null;
  unit_code?: string | null;
};

export class ProductAttributeError extends Error {
  readonly reason: "invalid_attribute" | "invalid_attribute_value" | "duplicate_attribute";

  constructor(reason: "invalid_attribute" | "invalid_attribute_value" | "duplicate_attribute") {
    super(reason);
    this.reason = reason;
  }
}

const clean = (value: unknown, max = 2000) => String(value ?? "").trim().slice(0, max);

export function serializeProductAttributes(
  attributes: ProductAttributeInput[],
  definitions: ProductFieldDefinition[],
) {
  const definitionsById = new Map(definitions.map((definition) => [definition.id, definition]));
  const seen = new Set<string>();

  return attributes.flatMap((attribute) => {
    const fieldId = clean(attribute.fieldId, 36);
    const value = clean(attribute.value);
    if (!fieldId || !value) return [];
    if (seen.has(fieldId)) throw new ProductAttributeError("duplicate_attribute");
    seen.add(fieldId);

    const definition = definitionsById.get(fieldId);
    if (!definition) throw new ProductAttributeError("invalid_attribute");
    const row: Record<string, unknown> = {
      field_definition_id: definition.id,
      unit_code: definition.unit_code || null,
    };

    if (definition.data_type === "integer") {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) throw new ProductAttributeError("invalid_attribute_value");
      row.value_integer = parsed;
    } else if (definition.data_type === "decimal") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new ProductAttributeError("invalid_attribute_value");
      row.value_decimal = parsed;
    } else if (definition.data_type === "boolean") {
      if (!["true", "false"].includes(value)) throw new ProductAttributeError("invalid_attribute_value");
      row.value_boolean = value === "true";
    } else if (definition.data_type === "date") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
        throw new ProductAttributeError("invalid_attribute_value");
      }
      row.value_date = value;
    } else if (definition.data_type === "json") {
      try {
        row.value_json = JSON.parse(value);
      } catch {
        throw new ProductAttributeError("invalid_attribute_value");
      }
    } else if (["multi_enum", "reference"].includes(definition.data_type)) {
      const parsed = value.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
      if (!parsed.length || (definition.data_type === "multi_enum" && definition.allowed_values?.length && parsed.some((item) => !definition.allowed_values?.includes(item)))) {
        throw new ProductAttributeError("invalid_attribute_value");
      }
      row.value_json = parsed;
    } else {
      if (definition.data_type === "enum" && definition.allowed_values?.length && !definition.allowed_values.includes(value)) {
        throw new ProductAttributeError("invalid_attribute_value");
      }
      row.value_text = value;
    }

    return [row];
  });
}

export const isContractRevisionError = (error: unknown) =>
  error instanceof Error && error.message.includes("contract_revision_stale");
