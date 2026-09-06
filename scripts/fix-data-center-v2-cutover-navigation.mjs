// one-shot lint fix; remove before final PR
import fs from 'node:fs';

const path = 'app/ui/admin/OperationsController.tsx';
let source = fs.readFileSync(path, 'utf8');
const must = (needle) => { if (!source.includes(needle)) throw new Error(`missing marker: ${needle}`); };

must('import { useEffect, useMemo, useState } from "react";');
source = source.replace('import { useEffect, useMemo, useState } from "react";', 'import Link from "next/link";\nimport { useRouter } from "next/navigation";\nimport { useEffect, useMemo, useState } from "react";');

must('export function OperationsController() {');
source = source.replace('export function OperationsController() {\n', 'export function OperationsController() {\n  const router = useRouter();\n');

must('window.location.assign(`/operations/data-center-v2?view=${next === "entry" ? "catalog" : "batches"}`);');
source = source.replace('window.location.assign(`/operations/data-center-v2?view=${next === "entry" ? "catalog" : "batches"}`);', 'router.push(`/operations/data-center-v2?view=${next === "entry" ? "catalog" : "batches"}`);');

must('<a className="primary" href="/operations/data-center-v2?view=catalog">فتح إدخال V2</a>');
source = source.replace('<a className="primary" href="/operations/data-center-v2?view=catalog">فتح إدخال V2</a>', '<Link className="primary" href="/operations/data-center-v2?view=catalog">فتح إدخال V2</Link>');
must('<a className="primary" href="/operations/data-center-v2?view=batches">فتح دفعات V2</a>');
source = source.replace('<a className="primary" href="/operations/data-center-v2?view=batches">فتح دفعات V2</a>', '<Link className="primary" href="/operations/data-center-v2?view=batches">فتح دفعات V2</Link>');

fs.writeFileSync(path, source);
