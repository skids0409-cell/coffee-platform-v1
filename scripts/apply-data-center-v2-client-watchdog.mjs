// one-shot helper; remove before final PR
import fs from 'node:fs';

const path = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
let source = fs.readFileSync(path, 'utf8');
const must = (needle) => { if (!source.includes(needle)) throw new Error(`missing marker: ${needle}`); };

must('const emptyReference: ReferenceData = {');
source = source.replace('const emptyReference: ReferenceData = {', `const mirrorDefinitions: Array<Omit<MirrorProbe, "state" | "count">> = [\n  { key: "products", label: "المنتجات العامة", endpoint: "/api/public-products" },\n  { key: "directory", label: "دليل الجهات", endpoint: "/api/public-directory" },\n  { key: "search", label: "البحث العام", endpoint: "/api/public-search?q=%D9%82%D9%87%D9%88%D8%A9" },\n];\n\nconst emptyReference: ReferenceData = {`);

must('const [mirror, setMirror] = useState<MirrorProbe[]>([\n    { key: "products", label: "المنتجات العامة", endpoint: "/api/public-products", state: "idle", count: null },\n    { key: "directory", label: "دليل الجهات", endpoint: "/api/public-directory", state: "idle", count: null },\n    { key: "search", label: "البحث العام", endpoint: "/api/public-search?q=%D9%82%D9%87%D9%88%D8%A9", state: "idle", count: null },\n  ]);');
source = source.replace('const [mirror, setMirror] = useState<MirrorProbe[]>([\n    { key: "products", label: "المنتجات العامة", endpoint: "/api/public-products", state: "idle", count: null },\n    { key: "directory", label: "دليل الجهات", endpoint: "/api/public-directory", state: "idle", count: null },\n    { key: "search", label: "البحث العام", endpoint: "/api/public-search?q=%D9%82%D9%87%D9%88%D8%A9", state: "idle", count: null },\n  ]);', 'const [mirror, setMirror] = useState<MirrorProbe[]>(() => mirrorDefinitions.map((probe) => ({ ...probe, state: "idle", count: null })));');

const oldRun = `  const runMirror = async () => {\n    setMirror((current) => current.map((probe) => ({ ...probe, state: "loading", count: null })));\n    const next = await Promise.all(mirror.map(async (probe) => {\n      try {\n        const response = await fetch(probe.endpoint, { cache: "no-store" });\n        const payload = await response.json().catch(() => null);\n        return { ...probe, state: response.ok ? "ok" as const : "error" as const, count: response.ok ? getCount(payload) : null };\n      } catch {\n        return { ...probe, state: "error" as const, count: null };\n      }\n    }));\n    setMirror(next);\n  };`;
must(oldRun);
const newRun = `  const runMirror = useCallback(async () => {\n    setMirror(mirrorDefinitions.map((probe) => ({ ...probe, state: "loading", count: null })));\n    const next = await Promise.all(mirrorDefinitions.map(async (probe) => {\n      try {\n        const response = await fetch(probe.endpoint, { cache: "no-store" });\n        const payload = await response.json().catch(() => null);\n        return { ...probe, state: response.ok ? "ok" as const : "error" as const, count: response.ok ? getCount(payload) : null };\n      } catch {\n        return { ...probe, state: "error" as const, count: null };\n      }\n    }));\n    setMirror(next);\n  }, []);\n\n  useEffect(() => {\n    if (state !== "ready") return;\n    const initial = window.setTimeout(() => void runMirror(), 0);\n    const interval = window.setInterval(() => void runMirror(), 60_000);\n    const onVisibility = () => { if (document.visibilityState === "visible") void runMirror(); };\n    document.addEventListener("visibilitychange", onVisibility);\n    return () => {\n      window.clearTimeout(initial);\n      window.clearInterval(interval);\n      document.removeEventListener("visibilitychange", onVisibility);\n    };\n  }, [state, runMirror]);`;
source = source.replace(oldRun, newRun);

must('<CatalogIntakeV2 reference={reference} onCreated={load} />');
source = source.replace('<CatalogIntakeV2 reference={reference} onCreated={load} />', '<CatalogIntakeV2 reference={reference} onCreated={async () => { await load(); await runMirror(); }} />');

source = source.replace('<div className={styles.panelHead}><div><h2>مرآة المنصة الرئيسية للزبون</h2><p className={styles.muted}>فحص read-only لواجهات النشر العامة. لا يسمح V2 بتجاوز بوابة publication.</p></div><button className={styles.primary} type="button" onClick={() => void runMirror()}>فحص الآن</button></div>', '<div className={styles.panelHead}><div><h2>مرآة المنصة الرئيسية للزبون</h2><p className={styles.muted}>Watchdog read-only يعمل عند فتح V2، كل 60 ثانية، وعند العودة للنافذة. لا يسمح V2 بتجاوز بوابة publication.</p></div><button className={styles.primary} type="button" onClick={() => void runMirror()}>فحص الآن</button></div>');

fs.writeFileSync(path, source);
