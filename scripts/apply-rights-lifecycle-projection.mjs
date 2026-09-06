import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");

const reviewImport = 'import { projectReviewLifecycle, type ReviewLifecycleProjection } from "@/lib/review-lifecycle-projection";';
const rightsImport = 'import { projectRightsLifecycle, type RightsLifecycleProjection } from "@/lib/rights-lifecycle-projection";';
if (!source.includes(reviewImport)) throw new Error("review lifecycle import missing");
if (!source.includes(rightsImport)) source = source.replace(reviewImport, `${reviewImport}\n${rightsImport}`);

const typeMarker = "  lifecycle?: ReviewLifecycleProjection;\n};";
if (!source.includes(typeMarker)) throw new Error("QueueRow lifecycle marker missing");
source = source.replace(typeMarker, "  lifecycle?: ReviewLifecycleProjection;\n  rightsLifecycle?: RightsLifecycleProjection;\n};");

const governedMarker = '  const governedReviewKeys = ["products", "brands", "organizations", "offers", "contents", "origins"] as const;';
if (!source.includes(governedMarker)) throw new Error("governed Review projection marker missing");
const rightsProjection = `  rows.rights = rows.rights.map((row) => ({\n    ...row,\n    rightsLifecycle: projectRightsLifecycle({ status: row.status, role }),\n  }));\n`;
source = source.replace(governedMarker, rightsProjection + governedMarker);

writeFileSync(path, source);
console.log("Rights queues now carry server lifecycle projections");
