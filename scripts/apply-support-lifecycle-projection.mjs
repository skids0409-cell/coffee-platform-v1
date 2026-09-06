import { readFileSync, writeFileSync } from "node:fs";

const routePath = "app/api/admin/review/route.ts";
let route = readFileSync(routePath, "utf8");
const betaImport = 'import { projectBetaLifecycle, type BetaLifecycleProjection } from "@/lib/beta-lifecycle-projection";';
const supportImport = 'import { projectSupportLifecycle } from "@/lib/support-lifecycle-projection";';
if (!route.includes(betaImport)) throw new Error("beta projection import marker missing");
if (!route.includes(supportImport)) route = route.replace(betaImport, `${betaImport}\n${supportImport}`);
const oldSupport = 'supportWorkspace: { requests: supportRequests.map((request) => ({ ...request, history: supportHistory.filter((event) => event.entity_id === request.id) })), staff: staffProfiles },';
const newSupport = `supportWorkspace: {\n      requests: supportRequests.map((request) => ({\n        ...request,\n        history: supportHistory.filter((event) => event.entity_id === request.id),\n        lifecycle: projectSupportLifecycle({\n          status: request.status,\n          role,\n          requesterPhone: request.requester_phone || null,\n          resolutionNote: request.resolution_note || null,\n        }),\n      })),\n      staff: staffProfiles,\n    },`;
if (route.includes(oldSupport)) route = route.replace(oldSupport, newSupport);
if (!route.includes("lifecycle: projectSupportLifecycle({")) throw new Error("support projection missing from API response");
writeFileSync(routePath, route);

const controllerPath = "app/ui/admin/OperationsController.tsx";
let controller = readFileSync(controllerPath, "utf8");
const oldProp = 'requests: <SupportWorkspace data={adminData.supportWorkspace} canDelete={adminData.profile.role === "admin"} focusId={deepLinkTarget.support} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />,';
const newProp = 'requests: <SupportWorkspace data={adminData.supportWorkspace} focusId={deepLinkTarget.support} onUpdated={(result) => setAdminData((current) => current ? adoptAdminPayload(current, result) : current)} />,';
if (controller.includes(oldProp)) controller = controller.replace(oldProp, newProp);
if (controller.includes('canDelete={adminData.profile.role === "admin"}')) throw new Error("Support canDelete client inference still present");
writeFileSync(controllerPath, controller);

console.log("Support lifecycle projection fully wired");
