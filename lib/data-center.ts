export type OrganizationIntakeRow = {
  sourceRowNumber: number;
  raw: Record<string, string>;
  normalized: {
    slug: string;
    name_ar: string;
    address_ar: string;
    district_ar: string | null;
    contact: string | null;
    website_url: string | null;
    phone: string | null;
    role_type: "cafe" | "roaster" | "seller" | "equipment_supplier" | "manufacturer" | "importer" | "service_provider";
  };
  status: "valid" | "warning" | "invalid";
  messages: string[];
};

const headerAliases = {
  name: ["اسم الكافيه", "اسم المقهى", "اسم الجهة", "name_ar", "name"],
  address: ["عنوان", "العنوان", "address_ar", "address"],
  contact: ["تواصل", "التواصل", "contact", "website_url", "phone", "instagram"],
  role: ["نوع الجهة", "الدور", "الفئة", "organization_type", "role_type", "type"],
};

const organizationRole = (value: string): OrganizationIntakeRow["normalized"]["role_type"] | null => {
  const role = identity(value).replace(/[_-]+/g, " ");
  if (!role) return "cafe";
  if (["مقهى", "كافيه", "cafe", "coffee shop"].includes(role)) return "cafe";
  if (["محمصة", "roaster", "roastery"].includes(role)) return "roaster";
  if (["بائع", "متجر", "seller", "shop"].includes(role)) return "seller";
  if (["مورد معدات", "equipment supplier", "equipment_supplier"].includes(role)) return "equipment_supplier";
  if (["مصنع", "مصنعّ", "manufacturer"].includes(role)) return "manufacturer";
  if (["مستورد", "importer"].includes(role)) return "importer";
  if (["مزود خدمة", "مركز تدريب", "مركز تعليم", "اكاديمية", "أكاديمية", "service provider", "service_provider", "training center"].includes(role)) return "service_provider";
  return null;
};

const clean = (value: unknown) => String(value ?? "").replace(/\u202c/g, "").trim();
const identity = (value: string) => clean(value).toLocaleLowerCase("ar-IQ").replace(/\s+/g, " ");

function fnv1a(value: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function organizationSlug(name: string, address: string) {
  return `cafe-bgd-${fnv1a(`${identity(name)}|${identity(address)}`)}`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => clean(value))) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  row.push(field.replace(/\r$/, ""));
  if (row.some((value) => clean(value))) rows.push(row);
  if (quoted) throw new Error("unclosed_quote");
  return rows;
}

function contactFields(value: string) {
  const contact = clean(value) || null;
  if (!contact) return { contact, website_url: null, phone: null };
  if (/^https?:\/\//i.test(contact)) return { contact, website_url: contact, phone: null };
  const handle = contact.match(/^@?([a-z0-9._]{2,40})$/i)?.[1];
  if (handle && /[a-z]/i.test(handle)) {
    return { contact, website_url: `https://www.instagram.com/${handle}/`, phone: null };
  }
  const phone = contact.replace(/[^+\d]/g, "");
  return { contact, website_url: null, phone: phone.length >= 7 ? phone : null };
}

function findHeader(headers: string[], aliases: string[]) {
  const normalized = headers.map(identity);
  return normalized.findIndex((header) => aliases.some((alias) => header === identity(alias)));
}

export function validateOrganizationCsv(
  text: string,
  existingRecords: Array<{ name_ar: string; address_ar: string }> = [],
) {
  if (!text.trim() || text.length > 1_000_000) throw new Error("invalid_size");
  const csv = parseCsv(text);
  if (csv.length < 2) throw new Error("empty_csv");
  if (csv.length > 501) throw new Error("too_many_rows");
  const headers = csv[0].map(clean);
  const nameIndex = findHeader(headers, headerAliases.name);
  const addressIndex = findHeader(headers, headerAliases.address);
  const contactIndex = findHeader(headers, headerAliases.contact);
  const roleIndex = findHeader(headers, headerAliases.role);
  if (nameIndex < 0 || addressIndex < 0) throw new Error("missing_headers");
  const knownRecords = new Set(existingRecords.map((record) => `${identity(record.name_ar)}|${identity(record.address_ar)}`));
  const seen = new Set<string>();
  const rows: OrganizationIntakeRow[] = csv.slice(1).map((values, index) => {
    const name = clean(values[nameIndex]);
    const address = clean(values[addressIndex]);
    const contact = contactFields(contactIndex >= 0 ? values[contactIndex] : "");
    const roleType = organizationRole(roleIndex >= 0 ? values[roleIndex] : "");
    const messages: string[] = [];
    if (name.length < 2) messages.push("اسم الجهة مفقود أو قصير جداً");
    if (address.length < 3) messages.push("العنوان مفقود أو قصير جداً");
    if (!roleType) messages.push("نوع الجهة غير معروف؛ استخدم مقهى أو محمصة أو بائع أو مورد معدات أو مصنّع أو مستورد أو مزود خدمة/تدريب");
    const rowIdentity = `${identity(name)}|${identity(address)}`;
    if (name && address && seen.has(rowIdentity)) messages.push("السجل مكرر داخل الملف");
    if (name && address && knownRecords.has(rowIdentity)) {
      messages.push("يبدو أن الجهة والعنوان موجودان مسبقاً");
    }
    if (name && address) seen.add(rowIdentity);
    const blocking = messages.length > 0;
    if (!contact.contact) messages.push("لا توجد وسيلة تواصل؛ يمكن استكمالها لاحقاً");
    return {
      sourceRowNumber: index + 2,
      raw: Object.fromEntries(headers.map((header, column) => [header || `column_${column + 1}`, clean(values[column])])),
      normalized: {
        slug: organizationSlug(name, address),
        name_ar: name,
        address_ar: address,
        district_ar: address.split(/[،,\-–|]/)[0]?.trim() || null,
        ...contact,
        role_type: roleType || "cafe",
      },
      status: blocking ? "invalid" : contact.contact ? "valid" : "warning",
      messages,
    };
  });
  return { headers, rows };
}
