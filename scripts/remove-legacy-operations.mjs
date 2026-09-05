import fs from "node:fs";

const platformPath = "app/ui/Platform.tsx";
const partnerPath = "app/ui/partner/PartnerPortal.tsx";
const source = fs.readFileSync(platformPath, "utf8");
const startMarker = "\ntype DataCenterBatch = {";
const endMarker = "\nconst betaTestTasks = [";
const partnerStartMarker = "\ntype PartnerSubmission =";
const partnerEndMarker = "\nfunction PartnerReviewQueue()";

const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);
const partnerStart = source.indexOf(partnerStartMarker);
const partnerEnd = source.indexOf(partnerEndMarker);

if (start < 0) throw new Error("legacy Operations start marker not found");
if (end < 0) throw new Error("legacy Operations end marker not found");
if (end <= start) throw new Error("legacy Operations markers are out of order");
if (partnerStart < start || partnerEnd <= partnerStart || partnerEnd >= end) throw new Error("PartnerPortal markers are outside the legacy block");
if (source.indexOf(startMarker, start + startMarker.length) !== -1) throw new Error("legacy Operations start marker is not unique");
if (source.indexOf(endMarker, end + endMarker.length) !== -1) throw new Error("legacy Operations end marker is not unique");

const partnerBlock = source.slice(partnerStart + 1, partnerEnd).replace("function PartnerPortal()", "export function PartnerPortal()");
fs.mkdirSync("app/ui/partner", { recursive: true });
fs.writeFileSync(
  partnerPath,
  `"use client";\n/* eslint-disable @typescript-eslint/no-explicit-any */\nimport { useCallback, useEffect, useState } from "react";\n\n${partnerBlock}\n`,
);

let next = source.slice(0, start) + source.slice(end);

for (const adminImport of [
  'import { TaxonomyWorkspace } from "@/app/ui/admin/TaxonomyWorkspace";\n',
  'import { RecordForm } from "@/app/ui/admin/RecordForm";\n',
  'import { MediaVaultWorkspace } from "@/app/ui/admin/MediaVaultWorkspace";\n',
  'import type { ProductKind, RecordCapabilityContract } from "@/lib/record-capability-types";\n',
]) {
  next = next.replace(adminImport, "");
}

next = next.replace(
  'import { useCallback, useEffect, useMemo, useRef, useState } from "react";\n',
  'import { useEffect, useMemo, useRef, useState } from "react";\nimport { PartnerPortal } from "@/app/ui/partner/PartnerPortal";\n',
);
next = next.replace('  else if (page.kind === "operations") body = <Operations />;\n', "");
next = next.replace('        {!(["home", "operations"] as string[]).includes(page.kind) && (\n', '        {!(["home"] as string[]).includes(page.kind) && (\n');
next = next.replace('/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */', '/* eslint-disable @next/next/no-img-element */');

for (const forbidden of [
  "type DataCenterBatch = {",
  "function Operations()",
  "operations-workspace-nav",
  "ReviewRecordEditor",
  "QualityIssueEditor",
  "MediaVaultWorkspace",
  "TaxonomyWorkspace",
  "RecordForm",
  "PartnerReviewQueue",
]) {
  if (next.includes(forbidden)) throw new Error(`legacy Operations residue remains: ${forbidden}`);
}

if (!next.includes('import { PartnerPortal } from "@/app/ui/partner/PartnerPortal";')) throw new Error("PartnerPortal import was not installed");
if (!next.includes('else if (page.kind === "partner") body = <PartnerPortal />;')) throw new Error("PartnerPortal route branch was not preserved");
if (!next.includes("const betaTestTasks = [")) throw new Error("public beta test surface was removed unexpectedly");
if (!next.includes("function HelpSupport()")) throw new Error("public support surface was removed unexpectedly");
if (!next.includes("export default function Platform")) throw new Error("Platform export was removed unexpectedly");
if (!partnerBlock.includes("export function PartnerPortal()")) throw new Error("PartnerPortal extraction failed");

fs.writeFileSync(platformPath, next);
console.log(`Removed ${source.length - next.length} characters of legacy Operations implementation from ${platformPath}.`);
console.log(`Extracted PartnerPortal to ${partnerPath}.`);
