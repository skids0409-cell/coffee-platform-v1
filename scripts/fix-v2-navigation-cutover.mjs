import fs from 'node:fs';

const appPath = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
const testPath = 'tests/operations-dedicated-route-cutover.test.mjs';

let app = fs.readFileSync(appPath, 'utf8');
const oldHero = '<Link className={styles.secondary} href="/operations?workspace=dashboard">مركز العمليات</Link>';
const newHero = '<Link className={styles.secondary} href="/operations/data-center-v2?view=overview">لوحة مركز البيانات V2</Link>';
if (!app.includes(oldHero)) throw new Error('missing V2 hero legacy-dashboard link');
app = app.replace(oldHero, newHero);
fs.writeFileSync(appPath, app);

let test = fs.readFileSync(testPath, 'utf8');
test = test.replace(
  'test("V2 links back to the explicit operations dashboard instead of the redirected root", () => {\n  assert.match(v2, /href="\\/operations\\?workspace=dashboard"/);\n  assert.doesNotMatch(v2, /href="\\/operations"/);\n});',
  'test("V2 primary navigation never drops the operator into the legacy dashboard", () => {\n  assert.match(v2, /href="\\/operations\\/data-center-v2\\?view=overview"/);\n  assert.doesNotMatch(v2, />مركز العمليات<\\/Link>/);\n  assert.doesNotMatch(v2, /href="\\/operations\\?workspace=dashboard">مركز العمليات/);\n});'
);
fs.writeFileSync(testPath, test);
