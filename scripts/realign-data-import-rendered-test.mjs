import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/rendered-html.test.mjs";
let source = readFileSync(path, "utf8");
const marker = '  const dataCenter = readFileSync(new URL("../app/api/admin/data-center/route.ts", import.meta.url), "utf8");';
const inserted = `${marker}\n  const dataImportProjection = readFileSync(new URL("../lib/data-import-lifecycle-projection.ts", import.meta.url), "utf8");`;
if (!source.includes(marker)) throw new Error("Data Center test marker missing");
if (!source.includes('const dataImportProjection = readFileSync(new URL("../lib/data-import-lifecycle-projection.ts"')) source = source.replace(marker, inserted);
if (!source.includes('  assert.match(source, /حفظ في الأرشيف/);')) throw new Error("archive label assertion missing");
source = source.replace('  assert.match(source, /حفظ في الأرشيف/);', '  assert.match(dataImportProjection, /label: "حفظ في الأرشيف"/);');
if (!source.includes('  assert.match(source, /مسح نهائي/);')) throw new Error("delete label assertion missing");
source = source.replace('  assert.match(source, /مسح نهائي/);', '  assert.match(dataImportProjection, /label: "مسح نهائي"/);');
writeFileSync(path, source);
console.log("Rendered Data Import assertions now follow the lifecycle projection owner");
