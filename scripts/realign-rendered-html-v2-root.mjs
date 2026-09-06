import fs from 'node:fs';
const path = 'tests/rendered-html.test.mjs';
let source = fs.readFileSync(path, 'utf8');

const replaceOnce = (from, to) => {
  if (!source.includes(from)) throw new Error(`missing marker: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
};

replaceOnce(
  'new Request("http://localhost/operations", {\n      headers: { accept: "text/html" },\n    }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  assert.equal(operations.status, 200);\n  assert.match(await operations.text(), /حاجز النشر مفعّل/);',
  'new Request("http://localhost/operations?workspace=dashboard", {\n      headers: { accept: "text/html" },\n    }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  assert.equal(operations.status, 200);\n  assert.match(await operations.text(), /حاجز النشر مفعّل/);'
);

replaceOnce(
  'new Request("http://localhost/operations", { headers: { accept: "text/html" } }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  const operationsHtml = await operations.text();\n  assert.match(operationsHtml, /طابور المراجعة والاعتماد/);',
  'new Request("http://localhost/operations?workspace=dashboard", { headers: { accept: "text/html" } }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  const operationsHtml = await operations.text();\n  assert.match(operationsHtml, /طابور المراجعة والاعتماد/);'
);

replaceOnce(
  'new Request("http://localhost/operations", { headers: { accept: "text/html" } }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  const html = await operations.text();\n  assert.equal(operations.status, 200);\n  assert.match(html, /طابور المراجعة والاعتماد/);\n  assert.match(html, /جارٍ فحص جلسة الإدارة/);',
  'new Request("http://localhost/operations?workspace=dashboard", { headers: { accept: "text/html" } }),\n    runtimeEnv,\n    runtimeContext,\n  );\n  const html = await operations.text();\n  assert.equal(operations.status, 200);\n  assert.match(html, /طابور المراجعة والاعتماد/);\n  assert.match(html, /جارٍ فحص جلسة الإدارة/);'
);

replaceOnce(
  '  assert.equal(response.status, 200);\n  assert.match(html, /طابور المراجعة والاعتماد/);\n  const source = readPlatformAndOperationsSource();\n  assert.match(source, /إضافة سجل جديد/);\n  assert.match(source, /تحويل إلى مسودات/);\n  assert.match(source, /إرسال للمراجعة/);',
  '  assert.equal(response.status, 200);\n  assert.match(html, /data-data-center-version="v2"/);\n  assert.match(html, /جارٍ تحميل Data Center V2/);\n  assert.match(html, /data-manual-uuid="false"/);\n  const source = readFileSync(new URL("../app/ui/admin/data-center-v2/DataCenterV2App.tsx", import.meta.url), "utf8");\n  assert.match(source, /فحص وتجهيز الدفعة/);\n  assert.match(source, /إدخال الكتالوج/);\n  assert.match(source, /data-import\.lifecycle\.v1/);'
);

fs.writeFileSync(path, source);
