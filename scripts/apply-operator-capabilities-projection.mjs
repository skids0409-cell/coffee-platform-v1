import { readFileSync, writeFileSync } from "node:fs";

function replaceRequired(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`missing marker: ${label}`);
  return source.replace(before, after);
}

const routePath = "app/api/admin/review/route.ts";
let route = readFileSync(routePath, "utf8");
route = replaceRequired(
  route,
  'import { projectSearchTermLifecycle } from "@/lib/search-term-lifecycle-projection";',
  'import { projectSearchTermLifecycle } from "@/lib/search-term-lifecycle-projection";\nimport { projectOperationsCapabilities } from "@/lib/operations-capabilities-projection";',
  "review route operator capability import",
);
route = replaceRequired(
  route,
  '  return {\n    queues: rows,',
  '  return {\n    operatorCapabilities: projectOperationsCapabilities(role),\n    queues: rows,',
  "review route operator capability projection",
);
writeFileSync(routePath, route);

const controllerPath = "app/ui/admin/OperationsController.tsx";
let controller = readFileSync(controllerPath, "utf8");
controller = replaceRequired(
  controller,
  'import type { SearchTermLifecycleAction, SearchTermLifecycleProjection } from "@/lib/search-term-lifecycle-projection";',
  'import type { SearchTermLifecycleAction, SearchTermLifecycleProjection } from "@/lib/search-term-lifecycle-projection";\nimport type { OperationsCapabilitiesProjection } from "@/lib/operations-capabilities-projection";',
  "controller operator capability import",
);
controller = replaceRequired(
  controller,
  'type AdminData = {\n  profile: { display_name: string | null; role: Role };',
  'type AdminData = {\n  profile: { display_name: string | null; role: Role };\n  operatorCapabilities: OperationsCapabilitiesProjection;',
  "controller AdminData operator capabilities",
);
controller = replaceRequired(
  controller,
  'archive: <ArchiveWorkspace items={adminData.inactiveCatalog} role={adminData.profile.role} workingId={workingId}',
  'archive: <ArchiveWorkspace items={adminData.inactiveCatalog} canDelete={adminData.operatorCapabilities.canDeleteInactiveCatalog} workingId={workingId}',
  "archive capability wiring",
);
controller = replaceRequired(
  controller,
  'canManageTaxonomy={adminData.profile.role === "admin"}',
  'canManageTaxonomy={adminData.operatorCapabilities.canManageTaxonomy}',
  "taxonomy capability wiring",
);
controller = replaceRequired(
  controller,
  'canRestore={["verifier", "admin"].includes(adminData.profile.role)}',
  'canRestore={adminData.operatorCapabilities.canRestoreRevision}',
  "revision restore capability wiring",
);
controller = replaceRequired(
  controller,
  'canDecide={["verifier", "admin"].includes(adminData.profile.role)}',
  'canDecide={adminData.operatorCapabilities.canResolveQualityIssue}',
  "quality decision capability wiring",
);
writeFileSync(controllerPath, controller);

const archivePath = "app/ui/admin/ArchiveWorkspace.tsx";
let archive = readFileSync(archivePath, "utf8");
archive = replaceRequired(archive, '  role: string;', '  canDelete: boolean;', "archive prop type");
archive = replaceRequired(archive, 'export function ArchiveWorkspace({ items, role, workingId, onOpen, onRestoreDraft, onDelete, importArchive }: ArchiveWorkspaceProps)', 'export function ArchiveWorkspace({ items, canDelete, workingId, onOpen, onRestoreDraft, onDelete, importArchive }: ArchiveWorkspaceProps)', "archive prop destructuring");
archive = replaceRequired(archive, '{role === "admin" && <button', '{canDelete && <button', "archive delete gate");
writeFileSync(archivePath, archive);

console.log("Operator capabilities projection cutover applied");
