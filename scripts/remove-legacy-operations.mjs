import fs from "node:fs";

const platformPath = "app/ui/Platform.tsx";
const source = fs.readFileSync(platformPath, "utf8");
const startMarker = "\ntype DataCenterBatch = {";
const endMarker = "\nconst betaTestTasks = [";

const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);

if (start < 0) throw new Error("legacy Operations start marker not found");
if (end < 0) throw new Error("legacy Operations end marker not found");
if (end <= start) throw new Error("legacy Operations markers are out of order");
if (source.indexOf(startMarker, start + startMarker.length) !== -1) throw new Error("legacy Operations start marker is not unique");
if (source.indexOf(endMarker, end + endMarker.length) !== -1) throw new Error("legacy Operations end marker is not unique");

let next = source.slice(0, start) + source.slice(end);

for (const adminImport of [
  'import { TaxonomyWorkspace } from "@/app/ui/admin/TaxonomyWorkspace";\n',
  'import { RecordForm } from "@/app/ui/admin/RecordForm";\n',
  'import { MediaVaultWorkspace } from "@/app/ui/admin/MediaVaultWorkspace";\n',
]) {
  next = next.replace(adminImport, "");
}

for (const forbidden of [
  "type DataCenterBatch = {",
  "function Operations()",
  "operations-workspace-nav",
  "ReviewRecordEditor",
  "QualityIssueEditor",
  "MediaVaultWorkspace",
  "TaxonomyWorkspace",
  "RecordForm",
]) {
  if (next.includes(forbidden)) throw new Error(`legacy Operations residue remains: ${forbidden}`);
}

if (!next.includes("const betaTestTasks = [")) throw new Error("public beta test surface was removed unexpectedly");
if (!next.includes("function HelpSupport()")) throw new Error("public support surface was removed unexpectedly");
if (!next.includes("export default function Platform")) throw new Error("Platform export was removed unexpectedly");

fs.writeFileSync(platformPath, next);
console.log(`Removed ${source.length - next.length} characters of legacy Operations implementation from ${platformPath}.`);
