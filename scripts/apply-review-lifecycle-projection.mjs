import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");

const importMarker = 'import { normalizeSearchText, type SearchEntityType, type SearchIntent } from "@/lib/search-governance";';
if (!source.includes(importMarker)) throw new Error("review import marker missing");
source = source.replace(importMarker, `${importMarker}\nimport { projectReviewLifecycle, type ReviewLifecycleProjection } from "@/lib/review-lifecycle-projection";`);

source = source.replace(
`  warnings: string[];\n};`,
`  warnings: string[];\n  lifecycle?: ReviewLifecycleProjection;\n};`,
);

if (!source.includes("async function loadQueue(token: string)")) throw new Error("loadQueue signature missing");
source = source.replace("async function loadQueue(token: string)", "async function loadQueue(token: string, role: string)");

const rowsMarker = `  const rows: Record<string, QueueRow[]> = {`;
const weakMarker = `  const weakQueryMap = new Map`;
const rowsStart = source.indexOf(rowsMarker);
const weakStart = source.indexOf(weakMarker, rowsStart);
if (rowsStart < 0 || weakStart < 0) throw new Error("queue projection insertion markers missing");

const insert = `  const governedReviewKeys = ["products", "brands", "organizations", "offers", "contents", "origins"] as const;\n  for (const key of governedReviewKeys) {\n    rows[key] = rows[key].map((row) => ({\n      ...row,\n      lifecycle: projectReviewLifecycle({ status: row.status, ready: row.ready, blockers: row.blockers, role }),\n    }));\n  }\n`;
source = source.slice(0, weakStart) + insert + source.slice(weakStart);

source = source.replaceAll("loadQueue(admin.token)", "loadQueue(admin.token, admin.profile.role)");

writeFileSync(path, source);
console.log("Review queues now carry server lifecycle projections");
