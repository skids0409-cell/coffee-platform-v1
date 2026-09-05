import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const architecture = fs.readFileSync("app/ui/admin/governance/OperationsCenterArchitecture.tsx", "utf8");
const shell = fs.readFileSync("app/ui/admin/OperationsWorkspaceShell.tsx", "utf8");

test("operations center projects the enterprise architecture into four operator domains", () => {
  assert.match(architecture, /ArchitectureGroup = "operate" \| "govern" \| "preserve" \| "administer"/);
  assert.match(architecture, /التشغيل/);
  assert.match(architecture, /الحوكمة/);
  assert.match(architecture, /الحفظ/);
  assert.match(architecture, /الإدارة/);
  assert.match(architecture, /DAMA-DMBOK · ISO 15489 · OAIS · master-detail-v1/);
});

test("all current Operations workspaces are assigned an architectural purpose", () => {
  for (const label of [
    "نظرة عامة",
    "إدارة السجلات",
    "إضافة سجل",
    "المراجعة والاعتماد",
    "طلبات الجهات",
    "الصور والملفات",
    "استيراد الجهات المشاركة",
    "قاموس البحث",
    "الطلبات والمساعدة",
    "الأرشيف",
    "التصنيفات والفلاتر",
  ]) assert.match(architecture, new RegExp(label));
  assert.match(shell, /operationsWorkspaceDescriptors\[value\]/);
});

test("major data-center surfaces retain operations-center-v2 visual normalization", () => {
  assert.match(shell, /data-governed-visual-contract="operations-center-v2"/);
  assert.match(architecture, /#operations-published/);
  assert.match(architecture, /#operations-review/);
  assert.match(architecture, /#operations-media/);
  assert.match(architecture, /\.data-center-imports/);
  assert.match(architecture, /\.taxonomy-workspace/);
  assert.match(architecture, /\.media-vault-assets/);
  assert.match(architecture, /\.media-vault-inspector/);
  assert.match(architecture, /\.record-editor/);
  assert.match(architecture, /\.quality-desk/);
  assert.match(architecture, /\.media-backlog/);
});

test("navigation metadata is emitted directly from shell state", () => {
  assert.match(shell, /data-architecture-navigation="true"/);
  assert.match(shell, /data-architecture-group=\{descriptor\.group\}/);
  assert.match(shell, /data-architecture-purpose=\{descriptor\.purpose\}/);
  assert.match(shell, /aria-description=/);
  assert.match(shell, /<OperationsCenterArchitecture workspace=\{workspace\} \/>/);
  assert.doesNotMatch(architecture, /MutationObserver|createPortal|document\./);
  assert.doesNotMatch(architecture, /fetch\(/);
});

test("architecture rail has responsive desktop, tablet, and mobile contracts", () => {
  assert.match(architecture, /@media \(max-width: 980px\)/);
  assert.match(architecture, /@media \(max-width: 700px\)/);
  assert.match(architecture, /@media \(max-width: 460px\)/);
  assert.match(architecture, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
