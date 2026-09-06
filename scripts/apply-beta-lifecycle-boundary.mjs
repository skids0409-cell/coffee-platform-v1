import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");

const rightsImport = 'import { projectRightsLifecycle, type RightsLifecycleProjection } from "@/lib/rights-lifecycle-projection";';
const betaImport = 'import { projectBetaLifecycle, type BetaLifecycleProjection } from "@/lib/beta-lifecycle-projection";';
if (!source.includes(rightsImport)) throw new Error("Rights projection import marker missing");
if (!source.includes(betaImport)) source = source.replace(rightsImport, `${rightsImport}\n${betaImport}`);

const typeMarker = "  rightsLifecycle?: RightsLifecycleProjection;\n};";
if (!source.includes(typeMarker)) throw new Error("QueueRow Rights marker missing");
source = source.replace(typeMarker, "  rightsLifecycle?: RightsLifecycleProjection;\n  betaLifecycle?: BetaLifecycleProjection;\n};");

const rightsProjectionMarker = `  rows.rights = rows.rights.map((row) => ({\n    ...row,\n    rightsLifecycle: projectRightsLifecycle({ status: row.status, role }),\n  }));`;
if (!source.includes(rightsProjectionMarker)) throw new Error("Rights queue projection marker missing");
const betaProjection = `  rows.beta = rows.beta.map((row) => ({\n    ...row,\n    betaLifecycle: projectBetaLifecycle(row.status),\n  }));\n`;
source = source.replace(rightsProjectionMarker, betaProjection + rightsProjectionMarker);

const oldAllowed = 'const allowedTables = ["products", "brands", "organizations", "offers", "contents", "origin_claims", "beta_feedback", "support_requests"] as const;';
const newAllowed = 'const allowedTables = ["products", "brands", "organizations", "offers", "contents", "origin_claims", "support_requests"] as const;';
if (!source.includes(oldAllowed)) throw new Error("allowedTables marker missing");
source = source.replace(oldAllowed, newAllowed);

const genericMarker = `  if (\n    !body?.table ||\n    !allowedTables.includes(body.table as (typeof allowedTables)[number]) ||`;
if (!source.includes(genericMarker)) throw new Error("generic mutation marker missing");
const betaBoundary = `  if (body?.table === "beta_feedback") {\n    if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id) || !body.status || !feedbackStatuses.includes(body.status)) {\n      return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });\n    }\n    try {\n      await adminRest(admin.token, "rpc/admin_transition_beta_feedback", {\n        method: "POST",\n        headers: { "content-type": "application/json" },\n        body: JSON.stringify({ p_feedback_id: body.id, p_next_status: body.status }),\n      });\n      return Response.json({ updated: true, ...(await loadQueue(admin.token, admin.profile.role)) });\n    } catch (error) {\n      const message = error instanceof Error ? error.message : "";\n      if (message.includes("beta_feedback_not_found")) return Response.json({ updated: false, reason: "not_found" }, { status: 404 });\n      if (message.includes("illegal_beta_feedback_transition") || message.includes("beta_feedback_state_unchanged")) return Response.json({ updated: false, reason: "illegal_transition" }, { status: 409 });\n      if (message.includes("invalid_beta_feedback_status")) return Response.json({ updated: false, reason: "invalid_input" }, { status: 400 });\n      if (message.includes("staff_required")) return Response.json({ updated: false, reason: "staff_required" }, { status: 403 });\n      throw error;\n    }\n  }\n`;
source = source.replace(genericMarker, betaBoundary + genericMarker);

const oldStatusValidation = `(body.table === "beta_feedback"\n      ? !feedbackStatuses.includes(body.status)\n      : body.table === "support_requests"\n        ? !supportStatuses.includes(body.status)\n        : !publicationStatuses.includes(body.status))`;
const newStatusValidation = `(body.table === "support_requests"\n      ? !supportStatuses.includes(body.status)\n      : !publicationStatuses.includes(body.status))`;
if (!source.includes(oldStatusValidation)) throw new Error("generic status validation marker missing");
source = source.replace(oldStatusValidation, newStatusValidation);

writeFileSync(path, source);
console.log("Beta feedback now uses atomic RPC and server lifecycle projection");
