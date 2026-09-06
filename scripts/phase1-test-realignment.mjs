import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one marker, found ${count}`);
  return source.replace(before, after);
}

const renderedPath = "tests/rendered-html.test.mjs";
let rendered = readFileSync(renderedPath, "utf8");
rendered = replaceOnce(rendered, 'import { readFileSync } from "node:fs";', 'import { readFileSync, readdirSync } from "node:fs";', "node fs import");
const helperMarker = 'const runtimeEnv = undefined;\nconst runtimeContext = undefined;\n';
const helper = `const runtimeEnv = undefined;\nconst runtimeContext = undefined;\n\nfunction readPlatformAndOperationsSource() {\n  const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");\n  const adminDirectory = new URL("../app/ui/admin/", import.meta.url);\n  const adminModules = readdirSync(adminDirectory)\n    .filter((name) => name.endsWith(".tsx"))\n    .map((name) => readFileSync(new URL(name, adminDirectory), "utf8"))\n    .join("\\n");\n  return \`\${platform}\\n\${adminModules}\`;\n}\n`;
rendered = replaceOnce(rendered, helperMarker, helper, "operations source helper");
const splitMarker = 'test("operations renders the protected data center workflow", async () => {';
const splitAt = rendered.indexOf(splitMarker);
if (splitAt < 0) throw new Error("rendered operations marker missing");
const head = rendered.slice(0, splitAt);
let tail = rendered.slice(splitAt);
tail = tail.replace(/readFileSync\(new URL\("\.\.\/app\/ui\/Platform\.tsx", import\.meta\.url\), "utf8"\)/g, "readPlatformAndOperationsSource()");
const mediaLegacyStart = 'test("media library follows the platform tree and every organization role", () => {';
const mediaLegacyEnd = 'test("quality desk distinguishes physical venues and processes unlinked findings", () => {';
const start = tail.indexOf(mediaLegacyStart);
const end = tail.indexOf(mediaLegacyEnd);
if (start < 0 || end < 0 || end <= start) throw new Error("legacy media test block markers missing");
const replacement = `test("media vault is independent from taxonomy navigation and remains controller-owned", () => {\n  const mediaUi = readFileSync(new URL("../app/ui/admin/MediaVaultWorkspace.tsx", import.meta.url), "utf8");\n  const controller = readFileSync(new URL("../app/ui/admin/OperationsController.tsx", import.meta.url), "utf8");\n  assert.match(controller, /media: <MediaVaultWorkspace/);\n  assert.match(mediaUi, /Media Vault — خزنة الأصول/);\n  assert.doesNotMatch(mediaUi, /consumer=media-workspace-v2|rootCategoryId|familyCategoryId/);\n});\n\n`;
tail = tail.slice(0, start) + replacement + tail.slice(end);
rendered = head + tail;
writeFileSync(renderedPath, rendered);

const mediaPath = "tests/media-vault-phase4.test.mjs";
let media = readFileSync(mediaPath, "utf8");
media = replaceOnce(
  media,
  'const platform = readFileSync(new URL("../app/ui/Platform.tsx", import.meta.url), "utf8");',
  'const platform = ["../app/ui/Platform.tsx", "../app/ui/admin/OperationsController.tsx", "../app/ui/admin/ReviewRecordEditor.tsx"].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\\n");',
  "media combined source",
);
media = replaceOnce(media, 'assert.match(platform, /workspace === "media" && <MediaVaultWorkspace/);', 'assert.match(platform, /media: <MediaVaultWorkspace/);', "media controller composition assertion");
writeFileSync(mediaPath, media);

const architecturePath = "tests/operations-center-architecture.test.mjs";
let architecture = readFileSync(architecturePath, "utf8");
architecture = replaceOnce(
  architecture,
  '  assert.match(shell, /aria-description=/);',
  '  assert.doesNotMatch(shell, /aria-description=/);\n  assert.match(shell, /aria-label=/);',
  "ARIA regression assertion",
);
writeFileSync(architecturePath, architecture);

console.log("Legacy extraction tests realigned to the physically extracted Operations architecture.");
