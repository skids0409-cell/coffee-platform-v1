import fs from 'node:fs';

const path = 'tests/rendered-html.test.mjs';
let source = fs.readFileSync(path, 'utf8');

const firstFrom = `test("operations center v2 covers editing, support processing, and all MVP data families", () => {\n  const source = readPlatformAndOperationsSource();\n  assert.match(source, /فتح وتدقيق/);\n  assert.match(source, /حفظ التعديل/);\n  assert.match(source, /معالجة طلبات المساعدة/);\n  assert.match(source, /مرجع فني/);`;
const firstTo = `test("operations center v2 covers editing, support processing, and all MVP data families", () => {\n  const source = readPlatformAndOperationsSource();\n  const supportWorkspace = readFileSync(new URL("../app/ui/admin/SupportWorkspace.tsx", import.meta.url), "utf8");\n  assert.match(source, /فتح وتدقيق/);\n  assert.match(source, /حفظ التعديل/);\n  assert.match(source, /معالجة طلبات المساعدة/);\n  assert.match(supportWorkspace, /ContextualEntitySelector context="support_technical_reference"/);\n  assert.match(supportWorkspace, /إنشاء مهمة تقنية/);`;
if (!source.includes(firstFrom)) throw new Error('support stale assertion marker not found');
source = source.replace(firstFrom, firstTo);

const secondFrom = `  assert.doesNotMatch(recordForm, /name="price"|name="availability"/);\n  assert.match(source, /المرفوضات والأرشيف/);`;
const secondTo = `  assert.doesNotMatch(recordForm, /name="price"|name="availability"/);\n  const archiveWorkspace = readFileSync(new URL("../app/ui/admin/ArchiveWorkspace.tsx", import.meta.url), "utf8");\n  assert.match(archiveWorkspace, /سجلات الكتالوج المرفوضة والمؤرشفة/);\n  assert.match(archiveWorkspace, /سجل كتالوج/);`;
if (!source.includes(secondFrom)) throw new Error('archive stale assertion marker not found');
source = source.replace(secondFrom, secondTo);

fs.writeFileSync(path, source);
console.log('rendered html stale assertions realigned');
