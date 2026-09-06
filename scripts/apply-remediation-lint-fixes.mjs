import fs from 'node:fs';

function replaceOnce(path, from, to) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(from)) throw new Error(`marker not found: ${path}`);
  fs.writeFileSync(path, source.replace(from, to));
}

replaceOnce(
  'app/ui/admin/ContextualEntitySelector.tsx',
  '  const [state, setState] = useState<"loading" | "ready" | "error">("loading");\n\n  useEffect(() => {\n    let cancelled = false;\n    setState("loading");',
  '  const [state, setState] = useState<"loading" | "ready" | "error">("loading");\n  const selectedEntityType = value?.entityType || "";\n\n  useEffect(() => {\n    let cancelled = false;'
);
replaceOnce(
  'app/ui/admin/ContextualEntitySelector.tsx',
  '        const nextType = result.contract.allowedEntityTypes.some((item) => item.entityType === value?.entityType)\n          ? String(value?.entityType || "")\n          : result.contract.allowedEntityTypes[0]?.entityType || "";\n        setEntityType(nextType);\n        if (value && value.entityType !== nextType) onChange(null);',
  '        const nextType = result.contract.allowedEntityTypes.some((item) => item.entityType === selectedEntityType)\n          ? selectedEntityType\n          : result.contract.allowedEntityTypes[0]?.entityType || "";\n        setEntityType(nextType);\n        if (selectedEntityType && selectedEntityType !== nextType) onChange(null);'
);
replaceOnce(
  'app/ui/admin/ContextualEntitySelector.tsx',
  '  }, [context, role]);',
  '  }, [context, onChange, role, selectedEntityType]);'
);

replaceOnce(
  'app/ui/admin/SupportWorkspace.tsx',
  '  useEffect(() => {\n    const task = selected?.technical_task;\n    setTechnicalTarget(task?.id ? { entityType: "technical_tasks", id: task.id, label: `${task.task_code} — ${task.title}` } : null);\n    setNewTaskTitle("");\n  }, [selected?.id, selected?.technical_task?.id]);',
  '  useEffect(() => {\n    const handle = window.setTimeout(() => {\n      const task = selected?.technical_task;\n      setTechnicalTarget(task?.id ? { entityType: "technical_tasks", id: task.id, label: `${task.task_code} — ${task.title}` } : null);\n      setNewTaskTitle("");\n    }, 0);\n    return () => window.clearTimeout(handle);\n  }, [selected?.id, selected?.technical_task]);'
);

replaceOnce(
  'app/ui/Platform.tsx',
  'import Link from "next/link";\nimport { useEffect, useMemo, useRef, useState } from "react";',
  'import Link from "next/link";\nimport { useRouter } from "next/navigation";\nimport { useEffect, useMemo, useRef, useState } from "react";'
);
replaceOnce(
  'app/ui/Platform.tsx',
  'function Header() {\n  const [open, setOpen] = useState(false);',
  'function Header() {\n  const router = useRouter();\n  const [open, setOpen] = useState(false);'
);
replaceOnce(
  'app/ui/Platform.tsx',
  '    else window.location.assign("/");',
  '    else router.push("/");'
);

console.log('remediation lint fixes applied');
