import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = resolve(root, "supabase/RECOVERY_MANIFEST.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const seenVersions = new Set();
const seenFiles = new Set();

for (const migration of manifest.migrations) {
  if (seenVersions.has(migration.version)) throw new Error(`duplicate migration version: ${migration.version}`);
  if (seenFiles.has(migration.file)) throw new Error(`duplicate migration file: ${migration.file}`);
  seenVersions.add(migration.version);
  seenFiles.add(migration.file);

  const sql = readFileSync(resolve(root, "supabase", migration.file), "utf8");
  const compact = sql.replace(/\s/gu, "");
  const digest = createHash("md5").update(compact, "utf8").digest("hex");
  if (digest !== migration.compact_md5) {
    throw new Error(`${migration.file}: expected ${migration.compact_md5}, got ${digest}`);
  }
}

console.log(`Verified ${manifest.migrations.length} recovered Supabase migrations.`);
