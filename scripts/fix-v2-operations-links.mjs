import fs from 'node:fs';
const path = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
let source = fs.readFileSync(path, 'utf8');
const target = 'href="/operations"';
const count = source.split(target).length - 1;
if (count !== 2) throw new Error(`expected 2 root operations links, found ${count}`);
source = source.replaceAll(target, 'href="/operations?workspace=dashboard"');
fs.writeFileSync(path, source);
// one-shot trigger
