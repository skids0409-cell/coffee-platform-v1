// one-shot cutover helper; remove before final PR
// trigger: apply default-route cutover
import fs from 'node:fs';

const controllerPath = 'app/ui/admin/OperationsController.tsx';
let controller = fs.readFileSync(controllerPath, 'utf8');
const must = (source, needle) => { if (!source.includes(needle)) throw new Error(`missing marker: ${needle}`); };

must(controller, 'import { DataCenterWorkspace } from "@/app/ui/admin/DataCenterWorkspace";');
must(controller, 'import { CatalogDraftWorkspace } from "@/app/ui/admin/CatalogDraftWorkspace";');
controller = controller.replace('import { DataCenterWorkspace } from "@/app/ui/admin/DataCenterWorkspace";\n', '');
controller = controller.replace('import { CatalogDraftWorkspace } from "@/app/ui/admin/CatalogDraftWorkspace";\n', '');

const oldRequested = '      if (requestedWorkspace && allowedWorkspaces.includes(requestedWorkspace)) setWorkspace(requestedWorkspace);';
const newRequested = `      if (requestedWorkspace === "entry" || requestedWorkspace === "imports") {\n        window.location.replace(\`/operations/data-center-v2?view=\${requestedWorkspace === "entry" ? "catalog" : "batches"}\`);\n        return;\n      }\n      if (requestedWorkspace && allowedWorkspaces.includes(requestedWorkspace)) setWorkspace(requestedWorkspace);`;
must(controller, oldRequested);
controller = controller.replace(oldRequested, newRequested);

const marker = '  const panels = {';
const openWorkspace = `  const openWorkspace = (next: OperationsWorkspaceId) => {\n    if (next === "entry" || next === "imports") {\n      window.location.assign(\`/operations/data-center-v2?view=\${next === "entry" ? "catalog" : "batches"}\`);\n      return;\n    }\n    setWorkspace(next);\n  };\n\n`;
must(controller, marker);
controller = controller.replace(marker, openWorkspace + marker);

const oldEntry = '    entry: <DataCenterWorkspace mode="entry" onChanged={loadAdmin} renderEntry={(reference, reload) => <CatalogDraftWorkspace reference={reference} onCreated={reload} />} />,';
const oldImports = '    imports: <DataCenterWorkspace mode="imports" onChanged={loadAdmin} />,';
const newEntry = '    entry: <section className="directory-state compact" data-data-center-cutover="v2"><h3>تم نقل الإدخال إلى Data Center V2</h3><p>المسار التشغيلي المعتمد الآن هو V2. المركز القديم متاح فقط لمسار rollback المقيد.</p><a className="primary" href="/operations/data-center-v2?view=catalog">فتح إدخال V2</a></section>,';
const newImports = '    imports: <section className="directory-state compact" data-data-center-cutover="v2"><h3>تم نقل الاستيراد إلى Data Center V2</h3><p>إدارة الدفعات ودورة حياتها تعمل من المسار الجديد فقط.</p><a className="primary" href="/operations/data-center-v2?view=batches">فتح دفعات V2</a></section>,';
must(controller, oldEntry);
must(controller, oldImports);
controller = controller.replace(oldEntry, newEntry).replace(oldImports, newImports);

const oldShell = '<OperationsWorkspaceShell workspace={workspace} onWorkspaceChange={setWorkspace} panels={panels}';
const newShell = '<OperationsWorkspaceShell workspace={workspace} onWorkspaceChange={openWorkspace} panels={panels}';
must(controller, oldShell);
controller = controller.replace(oldShell, newShell);
fs.writeFileSync(controllerPath, controller);

const v2Path = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
let v2 = fs.readFileSync(v2Path, 'utf8');
const oldEffect = `  useEffect(() => {\n    const handle = window.setTimeout(() => void load().catch(() => setState("error")), 0);\n    return () => window.clearTimeout(handle);\n  }, [load]);`;
const newEffect = `  useEffect(() => {\n    const handle = window.setTimeout(() => {\n      const requestedView = new URLSearchParams(window.location.search).get("view") as View | null;\n      const allowedViews: View[] = ["overview", "intake", "catalog", "batches", "handoffs", "client"];\n      if (requestedView && allowedViews.includes(requestedView)) setView(requestedView);\n      void load().catch(() => setState("error"));\n    }, 0);\n    return () => window.clearTimeout(handle);\n  }, [load]);`;
must(v2, oldEffect);
v2 = v2.replace(oldEffect, newEffect);
fs.writeFileSync(v2Path, v2);
