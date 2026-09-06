import { readFileSync, writeFileSync } from "node:fs";

const path = "tests/rendered-html.test.mjs";
let source = readFileSync(path, "utf8");
const oldAssertion = '  assert.match(platform, /canManageTaxonomy=\\{adminData\\.profile\\.role === "admin"\\}/);';
const newAssertion = '  assert.match(platform, /canManageTaxonomy=\\{adminData\\.operatorCapabilities\\.canManageTaxonomy\\}/);';
if (!source.includes(oldAssertion)) throw new Error("legacy taxonomy capability assertion missing");
source = source.replace(oldAssertion, newAssertion);
writeFileSync(path, source);
console.log("Taxonomy capability assertion now follows the server projection");
