import { readFileSync, writeFileSync } from "node:fs";
const path = "app/ui/admin/SupportWorkspace.tsx";
let source = readFileSync(path, "utf8");
const before = 'type SupportRequest = any & { lifecycle?: SupportLifecycleProjection };';
const after = 'type SupportRequest = { lifecycle?: SupportLifecycleProjection; [key: string]: any };';
if (!source.includes(before)) throw new Error("SupportRequest type marker missing");
source = source.replace(before, after);
writeFileSync(path, source);
console.log("SupportRequest preserves lifecycle typing while allowing legacy fields");
