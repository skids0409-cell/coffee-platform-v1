import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const architecture = fs.readFileSync("app/ui/admin/governance/OperationsCenterArchitecture.tsx", "utf8");
const bridge = fs.readFileSync("app/ui/admin/governance/GovernedOperationsBridge.tsx", "utf8");
const platform = fs.readFileSync("app/ui/Platform.tsx", "utf8");

test("operations center projects the enterprise architecture into four operator domains", () => {
  assert.match(architecture, /type ArchitectureGroup = "operate" \| "govern" \| "preserve" \| "administer"/);
  assert.match(architecture, /التشغيل/);
  assert.match(architecture, /الحوكمة/);
  assert.match(architecture, /الحفظ/);
  assert.match(architecture, /الإدارة/);
  assert.match(architecture, /DAMA-DMBOK · ISO 15489 · OAIS · master-detail-v1/);
});

test("all current Operations tabs are assigned an architectural purpose", () => {
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
  ]) {
    assert.match(platform, new RegExp(label));
    assert.match(architecture, new RegExp(label));
  }
});

test("major data-center surfaces are projected under operations-center-v2", () => {
  assert.match(architecture, /operations-center-v2/);
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

test("navigation remains behavior-preserving while gaining architectural metadata", () => {
  assert.match(architecture, /dataset\.architectureGroup/);
  assert.match(architecture, /dataset\.architecturePurpose/);
  assert.match(architecture, /aria-description/);
  assert.doesNotMatch(architecture, /fetch\(/);
  assert.doesNotMatch(architecture, /method:\s*["']POST["']/);
  assert.match(bridge, /<OperationsCenterArchitecture \/>/);
});

test("architecture projection has responsive desktop, tablet, and mobile contracts", () => {
  assert.match(architecture, /@media \(max-width: 980px\)/);
  assert.match(architecture, /@media \(max-width: 700px\)/);
  assert.match(architecture, /@media \(max-width: 460px\)/);
  assert.match(architecture, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
