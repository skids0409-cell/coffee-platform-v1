import { readFileSync, writeFileSync } from "node:fs";

const path = "app/api/admin/data-center/route.ts";
let source = readFileSync(path, "utf8");

const importMarker = 'import { loadRecordCapability, serializeCapabilityAttributes } from "@/lib/record-capabilities";';
const projectionImport = 'import { projectDataImportLifecycle } from "@/lib/data-import-lifecycle-projection";';
if (!source.includes(importMarker)) throw new Error("record capability import marker missing");
if (!source.includes(projectionImport)) source = source.replace(importMarker, `${importMarker}\n${projectionImport}`);

source = source.replace('async function loadDataCenter(token: string) {', 'async function loadDataCenter(token: string, role: string) {');

const oldReturn = 'return { marketId: markets[0]?.id || null, batches, referenceData: { categories, organizations, products, brands: brands.map((brand) => ({ ...brand, product_kinds: [...new Set(brand.brand_product_kinds.map((row) => row.product_kind))] })), countries, filterDefinitions: filterDefinitions.map((rule) => ({ category_id: rule.category_id, sort_order: rule.sort_order, is_required_for_publish: rule.is_required_for_publish, ...rule.field_definitions })) } };';
const newReturn = 'return { marketId: markets[0]?.id || null, batches: batches.map((batch) => ({ ...batch, lifecycle: projectDataImportLifecycle({ status: batch.status, role }) })), referenceData: { categories, organizations, products, brands: brands.map((brand) => ({ ...brand, product_kinds: [...new Set(brand.brand_product_kinds.map((row) => row.product_kind))] })), countries, filterDefinitions: filterDefinitions.map((rule) => ({ category_id: rule.category_id, sort_order: rule.sort_order, is_required_for_publish: rule.is_required_for_publish, ...rule.field_definitions })) } };';
if (!source.includes(oldReturn)) throw new Error("loadDataCenter return marker missing");
source = source.replace(oldReturn, newReturn);

const oldDetail = 'return Response.json({ authenticated: true, batch: batch[0], rows });';
const newDetail = 'return Response.json({ authenticated: true, batch: { ...batch[0], lifecycle: projectDataImportLifecycle({ status: batch[0].status, role: admin.profile.role }) }, rows });';
if (!source.includes(oldDetail)) throw new Error("batch detail response marker missing");
source = source.replace(oldDetail, newDetail);

source = source.replaceAll('loadDataCenter(admin.token)', 'loadDataCenter(admin.token, admin.profile.role)');

if (source.includes('loadDataCenter(admin.token)')) throw new Error("unprojected loadDataCenter call remains");
if (!source.includes('projectDataImportLifecycle({ status: batch.status, role })')) throw new Error("batch projection missing");
writeFileSync(path, source);
console.log("Data Import lifecycle projection attached to API responses");
