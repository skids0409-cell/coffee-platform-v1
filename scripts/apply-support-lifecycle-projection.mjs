import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/review/route.ts";
let source = readFileSync(path, "utf8");

const betaImport = 'import { projectBetaLifecycle, type BetaLifecycleProjection } from "@/lib/beta-lifecycle-projection";';
const supportImport = 'import { projectSupportLifecycle } from "@/lib/support-lifecycle-projection";';
if (!source.includes(betaImport)) throw new Error("beta projection import marker missing");
if (!source.includes(supportImport)) source = source.replace(betaImport, `${betaImport}\n${supportImport}`);

const oldSupport = 'supportWorkspace: { requests: supportRequests.map((request) => ({ ...request, history: supportHistory.filter((event) => event.entity_id === request.id) })), staff: staffProfiles },';
const newSupport = `supportWorkspace: {\n      requests: supportRequests.map((request) => ({\n        ...request,\n        history: supportHistory.filter((event) => event.entity_id === request.id),\n        lifecycle: projectSupportLifecycle({\n          status: request.status,\n          role,\n          requesterPhone: request.requester_phone || null,\n          resolutionNote: request.resolution_note || null,\n        }),\n      })),\n      staff: staffProfiles,\n    },`;
if (!source.includes(oldSupport)) throw new Error("support workspace return marker missing");
source = source.replace(oldSupport, newSupport);

writeFileSync(path, source);
console.log("Support workspace now receives server lifecycle projection");
