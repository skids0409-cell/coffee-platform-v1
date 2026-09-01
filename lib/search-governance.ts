export type SearchEntityType = "product" | "organization" | "content" | "origin";
export type SearchIntent = SearchEntityType | "broad" | "unknown";
export type SearchRequestType = SearchEntityType | "all" | "smart";

export type SearchRule = {
  id?: string;
  canonical_term_ar: string;
  canonical_term_en: string | null;
  normalized_term: string;
  aliases: string[];
  intent: Exclude<SearchIntent, "unknown">;
  entity_scope: SearchEntityType[];
  match_mode: "exact" | "prefix" | "contains";
  weight: number;
};

export type SearchPlan = {
  normalizedQuery: string;
  intent: SearchIntent;
  searchedTypes: SearchEntityType[];
  searchTerms: string[];
  matchedTerm: string | null;
  explanation: string;
};

export const allSearchTypes: SearchEntityType[] = [
  "product",
  "origin",
  "content",
  "organization",
];

export function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("ar")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[,%*().،؛:!?؟/\\[\]{}'"`~@#$%^&+=_|<>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function expandArabicStorageVariants(value: string, limit = 32) {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];

  let variants = [normalized];
  const variablePositions = Array.from(normalized)
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => character === "ا" || character === "ه" || character === "ي")
    .sort((left, right) => {
      const priority = (character: string) => character === "ا" ? 0 : character === "ه" ? 1 : 2;
      return priority(left.character) - priority(right.character) || left.index - right.index;
    });

  for (const { character, index } of variablePositions) {
    const alternatives = character === "ا"
      ? ["ا", "أ", "إ", "آ"]
      : character === "ه"
        ? ["ه", "ة"]
        : ["ي", "ى"];
    const next = new Set<string>();
    for (const variant of variants) {
      for (const alternative of alternatives) {
        next.add(`${variant.slice(0, index)}${alternative}${variant.slice(index + 1)}`);
        if (next.size >= limit) break;
      }
      if (next.size >= limit) break;
    }
    variants = Array.from(next);
    if (variants.length >= limit) break;
  }

  return variants.slice(0, limit);
}

function aliasesFor(rule: SearchRule) {
  return [rule.normalized_term, rule.canonical_term_ar, rule.canonical_term_en || "", ...rule.aliases]
    .map(normalizeSearchText)
    .filter((term, index, list) => term.length >= 2 && list.indexOf(term) === index);
}

function ruleScore(query: string, rule: SearchRule) {
  const aliases = aliasesFor(rule);
  let best = -1;
  for (const alias of aliases) {
    if (query === alias) best = Math.max(best, 1000 + alias.length * 10);
    else if (rule.match_mode === "prefix" && query.startsWith(alias)) best = Math.max(best, 700 + alias.length * 10);
    else if (rule.match_mode === "contains" && query.includes(alias)) best = Math.max(best, 500 + alias.length * 10);
  }
  return best < 0 ? -1 : best + rule.weight;
}

export function matchSearchRule(query: string, rules: SearchRule[]) {
  const normalized = normalizeSearchText(query);
  return rules
    .map((rule) => ({ rule, score: ruleScore(normalized, rule) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.rule || null;
}

export function buildSearchPlan(
  query: string,
  requestedType: SearchRequestType,
  rules: SearchRule[],
): SearchPlan {
  const normalizedQuery = normalizeSearchText(query);
  const matched = matchSearchRule(normalizedQuery, rules);
  const searchedTypes = requestedType === "smart"
    ? matched?.entity_scope?.length ? matched.entity_scope : allSearchTypes
    : requestedType === "all" ? allSearchTypes : [requestedType];
  const expanded = matched ? aliasesFor(matched) : [];
  const searchTerms = [normalizedQuery, ...expanded]
    .filter((term, index, list) => term.length >= 2 && list.indexOf(term) === index)
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);
  const intent: SearchIntent = matched?.intent || "unknown";
  const explanation = requestedType !== "smart"
    ? "تم تطبيق نوع النتائج الذي اخترته يدوياً."
    : intent === "broad"
      ? "هذا بحث عام؛ نعرض العائلات المناسبة في مجموعات منفصلة."
      : matched
        ? `فهمنا المقصود وفق المصطلح المعتمد «${matched.canonical_term_ar}».`
        : "لم نجد قاعدة خاصة؛ بحثنا في جميع أقسام المنصة من دون افتراض صامت.";
  return {
    normalizedQuery,
    intent,
    searchedTypes,
    searchTerms,
    matchedTerm: matched?.canonical_term_ar || null,
    explanation,
  };
}

export function rankSearchText(
  query: string,
  title: string,
  subtitle: string,
  expandedTerms: string[],
) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedTitle = normalizeSearchText(title);
  const normalizedSubtitle = normalizeSearchText(subtitle);
  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 85;
  if (normalizedTitle.includes(normalizedQuery)) return 70;
  if (normalizedSubtitle.includes(normalizedQuery)) return 45;
  const alias = expandedTerms.find((term) => normalizedTitle.includes(normalizeSearchText(term)));
  if (alias) return 35;
  return expandedTerms.some((term) => normalizedSubtitle.includes(normalizeSearchText(term))) ? 20 : 0;
}
