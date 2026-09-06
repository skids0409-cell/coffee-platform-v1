// one-shot wiring helper; remove before final PR
import fs from 'node:fs';

const appPath = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
const must = (needle) => { if (!app.includes(needle)) throw new Error(`missing marker: ${needle}`); };

must('import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";');
app = app.replace('import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";', 'import { StandardConfirmDialog } from "@/app/ui/admin/StandardConfirmDialog";\nimport { CatalogIntakeV2 } from "@/app/ui/admin/data-center-v2/CatalogIntakeV2";');

must('type View = "overview" | "intake" | "batches" | "handoffs" | "client";');
app = app.replace('type View = "overview" | "intake" | "batches" | "handoffs" | "client";', 'type View = "overview" | "intake" | "catalog" | "batches" | "handoffs" | "client";');

must('categories: Array<{ id: string; name_ar: string }>;');
app = app.replace('categories: Array<{ id: string; name_ar: string }>;', 'categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null; catalog_product_kind: string | null }>;');
app = app.replace('organizations: Array<{ id: string; name_ar: string; status: string }>;', 'organizations: Array<{ id: string; name_ar: string; status: string; organization_roles?: Array<{ role_type: string }> }>;');
app = app.replace('brands: Array<{ id: string; name_ar: string }>;', 'brands: Array<{ id: string; name_ar: string; product_kinds?: string[] }>;');
app = app.replace('countries: Array<{ code: string; name_ar: string }>;', 'countries: Array<{ code: string; name_ar: string; coffee_regions?: Array<{ id: string; name_ar: string }> }>;');

must('{ id: "intake", label: "الإدخال", description: "CSV وسجل جهة واحد" },');
app = app.replace('{ id: "intake", label: "الإدخال", description: "CSV وسجل جهة واحد" },', '{ id: "intake", label: "الإدخال", description: "CSV وسجل جهة واحد" },\n  { id: "catalog", label: "إدخال الكتالوج", description: "Master / Vendor / Content / Origin" },');

must('{view === "batches" && <section className={styles.panel}>');
app = app.replace('{view === "batches" && <section className={styles.panel}>', '{view === "catalog" && <CatalogIntakeV2 reference={reference} onCreated={load} />}\n\n          {view === "batches" && <section className={styles.panel}>');

fs.writeFileSync(appPath, app);

const cssPath = 'app/ui/admin/data-center-v2/DataCenterV2.module.css';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.entityTabs {')) {
  css += `\n\n.wide {\n  grid-column: 1 / -1;\n}\n\n.catalogForm {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  margin-top: 16px;\n}\n\n.entityTabs {\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 10px;\n  margin: 16px 0;\n}\n\n.entityTabs button {\n  appearance: none;\n  border: 1px solid #cdbfae;\n  border-radius: 12px;\n  background: #fff;\n  padding: 12px;\n  text-align: right;\n  cursor: pointer;\n  color: inherit;\n  font: inherit;\n}\n\n.entityTabs button b,\n.entityTabs button small {\n  display: block;\n}\n\n.entityTabs button small {\n  margin-top: 4px;\n  color: #756b63;\n}\n\n.entityTabs button[data-active="true"] {\n  border-color: #2f4f3f;\n  background: #edf5f0;\n}\n\n@media (max-width: 720px) {\n  .catalogForm,\n  .entityTabs { grid-template-columns: 1fr; }\n}\n`;
}
fs.writeFileSync(cssPath, css);
