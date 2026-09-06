import fs from 'node:fs';

function patch(path, transforms) {
  let src = fs.readFileSync(path, 'utf8');
  for (const [from, to] of transforms) {
    if (!src.includes(from)) throw new Error(`marker not found in ${path}: ${from.slice(0, 140)}`);
    src = src.replace(from, to);
  }
  fs.writeFileSync(path, src);
}

patch('app/ui/admin/SearchGovernanceWorkspace.tsx', [
  [
    '  onLifecycleAction: (term: SearchTerm, action: SearchTermLifecycleAction) => void;\n  renderEditingTerm?: (term: SearchTerm) => ReactNode;',
    '  onLifecycleAction: (term: SearchTerm, action: SearchTermLifecycleAction) => void;\n  onPromoteWeakQuery: (gap: WeakQuery) => void;\n  renderEditingTerm?: (term: SearchTerm) => ReactNode;'
  ],
  [
    '  onLifecycleAction,\n  renderEditingTerm,',
    '  onLifecycleAction,\n  onPromoteWeakQuery,\n  renderEditingTerm,'
  ],
  [
    '{weakQueries.map((gap) => <div role="row" key={gap.query}><b>{gap.query}</b><span>{intentLabels[gap.inferredIntent]}</span><span>{gap.zeroResults}</span><span>{gap.lowResults}</span></div>)}',
    '{weakQueries.map((gap) => <div role="row" key={gap.query}><b>{gap.query}</b><span>{intentLabels[gap.inferredIntent]}</span><span>{gap.zeroResults}</span><span>{gap.lowResults}</span><button type="button" disabled={workingId === `weak:${gap.query}`} onClick={() => onPromoteWeakQuery(gap)}>تحويل لمسودة محكومة</button></div>)}'
  ],
]);

patch('app/ui/admin/OperationsController.tsx', [
  [
    '  const performSearchTermAction = async (term: SearchTerm, action: SearchTermLifecycleAction) => {',
    `  const promoteWeakQuery = async (gap: AdminData["searchGovernance"]["weakQueries"][number]) => {
    const entityScope: SearchEntityType[] = gap.inferredIntent === "organization" ? ["organization"] : gap.inferredIntent === "origin" ? ["origin"] : gap.inferredIntent === "content" ? ["content"] : ["product"];
    const workingKey = \`weak:\${gap.query}\`;
    setWorkingId(workingKey);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_search_term",
        canonicalTermAr: gap.query,
        canonicalTermEn: null,
        aliases: [],
        intent: gap.inferredIntent === "unknown" ? "broad" : gap.inferredIntent,
        entityScope,
        matchMode: "contains",
        weight: 50,
        sourceBasis: "observed_query",
      }),
    });
    const data = await response.json().catch(() => ({}));
    setWorkingId("");
    if (!response.ok) {
      setAdminMessage(data.reason === "invalid_input" ? "تعذر تحويل عبارة البحث إلى مسودة محكومة." : "العبارة موجودة مسبقاً في القاموس أو تعذر إنشاؤها.");
      return;
    }
    setAdminData((current) => current ? adoptAdminPayload(current, data) : current);
    setSearchTermView("draft");
    setAdminMessage(\`أضيفت «\${gap.query}» كمسودة من سجل البحث الفعلي؛ راجع المرادفات والنطاق ثم فعّلها.\`);
  };

  const performSearchTermAction = async (term: SearchTerm, action: SearchTermLifecycleAction) => {`
  ],
  [
    'onLifecycleAction={requestSearchTermAction} renderEditingTerm=',
    'onLifecycleAction={requestSearchTermAction} onPromoteWeakQuery={(gap) => void promoteWeakQuery(gap)} renderEditingTerm='
  ],
]);

console.log('search weak query intake cutover applied');
