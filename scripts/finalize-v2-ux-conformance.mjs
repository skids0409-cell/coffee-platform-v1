import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8'); const write=(p,s)=>fs.writeFileSync(p,s);
function rep(s,a,b,p){if(!s.includes(a))throw new Error(`missing ${p}: ${a.slice(0,90)}`);return s.split(a).join(b)}

// Data Center visible Arabic cleanup.
{
 const p='app/ui/admin/data-center-v2/DataCenterV2App.tsx'; let s=read(p);
 const pairs=[
  ['<p>لا UUID يدوي، لا نشر مباشر، ولا انتقال دورة حياة خارج الأفعال التي يعيدها الخادم.</p>','<p>لا إدخال يدوي للمعرّفات، ولا نشر مباشر، ولا انتقال في دورة الحياة خارج الإجراءات التي يسمح بها الخادم.</p>'],
  ['تنتظر action projected من الخادم','تنتظر إجراءً مصرحاً به من الخادم'],
  ['مسار متوافق مع intake الحالي؛ يبدأ كمسودة ولا ينشر مباشرة.','مسار متوافق مع آلية الإدخال الحالية؛ يبدأ كمسودة ولا ينشر مباشرة.'],
  ['<span className={styles.badge}>Draft only</span>','<span className={styles.badge}>مسودة فقط</span>'],
  ['تدخل staging فقط، ثم تتحول إلى مسودات بإجراء منفصل.','تدخل منطقة التجهيز فقط، ثم تتحول إلى مسودات بإجراء منفصل.'],
  ['المصطلحات والمرادفات وweak-query intake.','المصطلحات والمرادفات ومعالجة عبارات البحث الضعيفة.'],
  ['Watchdog read-only يعمل عند فتح V2، كل 60 ثانية، وعند العودة للنافذة. لا يسمح V2 بتجاوز بوابة publication.','فحص مراقبة للقراءة فقط يعمل عند فتح V2، وكل 60 ثانية، وعند العودة للنافذة. لا يسمح V2 بتجاوز بوابة النشر.'],
  ['<span className={styles.badge} data-tone="ready">V2 · محكوم من الخادم</span>','<span className={styles.badge} data-tone="ready">الإصدار V2 · محكوم من الخادم</span>'],
 ]; for(const [a,b] of pairs)s=rep(s,a,b,p);
 s=s.replace('const batchStatusLabel = (status: string) => ({','const validationStatusLabel = (status: string) => ({ valid: "صالح", warning: "تحذير", invalid: "غير صالح" }[status] || status);\n\nconst batchStatusLabel = (status: string) => ({');
 s=s.replace('<span className={styles.badge}>{row.validation_status}</span>','<span className={styles.badge}>{validationStatusLabel(row.validation_status)}</span>');
 write(p,s);
}

// Pending asset review: remove user-facing English and full UUID display.
{
 const p='app/ui/admin/PendingAssetReviewConsole.tsx'; let s=read(p);
 const pairs=[
  ['<span className="eyebrow">Unified Asset Review</span>','<span className="eyebrow">مراجعة الأصول الموحدة</span>'],
  ['طابور Pending Technical Audit / Pending Approval فارغ.','طابور الفحص التقني والاعتماد فارغ.'],
  ['{asset.lifecycle_state === "pending_technical_audit" ? "Pending Technical Audit" : "Pending Approval"}','{asset.lifecycle_state === "pending_technical_audit" ? "بانتظار الفحص التقني" : "بانتظار الاعتماد"}'],
  ['aria-label="Contextual Inspector"','aria-label="المعاين السياقي"'],
  ['>Contextual Inspector</span>','>المعاين السياقي</span>'],
  ['<p className="mt-1 text-xs text-[#756b63]">Asset ID: {selected.id}</p>','<p className="mt-1 text-xs text-[#756b63]">مرجع داخلي: {selected.id.slice(0, 8)}…</p>'],
  ['<legend className="px-2 font-black">Approve & Assign · اعتماد وإسناد</legend>','<legend className="px-2 font-black">اعتماد وإسناد</legend>'],
  ['>Approve & Assign</button>','>اعتماد وإسناد</button>'],
  ['<legend className="px-2 font-black">Reject & Quarantine · رفض وحجر</legend>','<legend className="px-2 font-black">رفض وحجر</legend>'],
  ['>Reject & Quarantine</button>','>رفض وحجر</button>'],
 ]; for(const [a,b] of pairs)s=rep(s,a,b,p);
 // Human-readable uploader role and technical status without changing stored values.
 s=s.replace('const roleLabels: Record<string, string> = {','const staffRoleLabels: Record<string, string> = { admin: "مدير", verifier: "مراجع", editor: "محرر", staff: "موظف" };\nconst technicalStatusLabels: Record<string, string> = { pending_technical_audit: "بانتظار الفحص التقني", validating: "قيد الفحص", passed: "اجتاز الفحص", failed: "فشل الفحص", pending_approval: "بانتظار الاعتماد" };\n\nconst roleLabels: Record<string, string> = {');
 s=s.replace('{selected.uploader?.role || "staff"} · {selected.uploaded_by}','{staffRoleLabels[selected.uploader?.role || "staff"] || "موظف"}');
 s=s.replace('<div><small>الفحص</small><b className="block">{selected.technical_status}</b>','<div><small>الفحص</small><b className="block">{technicalStatusLabels[selected.technical_status] || "حالة فحص مسجلة"}</b>');
 write(p,s);
}

// Preservation: Arabic visible conformance state and package labels; keep technical identifiers as metadata.
{
 const p='app/ui/admin/governance/MediaPreservationProjection.tsx'; let s=read(p);
 s=s.replace('const conformanceTone = conformance.conformanceStatus === "CONFORMANT" ? "ready" : conformance.conformanceStatus === "NON_CONFORMANT" ? "blocked" : "neutral";','const conformanceTone = conformance.conformanceStatus === "CONFORMANT" ? "ready" : conformance.conformanceStatus === "NON_CONFORMANT" ? "blocked" : "neutral";\n  const conformanceLabel = conformance.conformanceStatus === "CONFORMANT" ? "متوافق" : conformance.conformanceStatus === "NON_CONFORMANT" ? "غير متوافق" : "غير معروف";');
 s=s.replace('{conformance.available ? conformance.conformanceStatus : "التوافق غير متاح"}','{conformance.available ? conformanceLabel : "التوافق غير متاح"}');
 s=s.replace('label="AIP" value={data.preservationSummary.aipCount}','label="حزم الحفظ (AIP)" value={data.preservationSummary.aipCount}');
 s=s.replace('label="DIP" value={data.preservationSummary.dipCount}','label="حزم التوزيع (DIP)" value={data.preservationSummary.dipCount}');
 s=s.replace('if (message.startsWith("preservation:")) return "تعذر تحميل سجل OAIS Preservation من واجهة الحفظ.";','if (message.startsWith("preservation:")) return "تعذر تحميل سجل الحفظ من الواجهة الخادمية.";');
 write(p,s);
}

// Align old tests with Arabic-first visible copy while preserving architectural assertions.
{
 const p='tests/media-preservation-ui-projection.test.mjs'; let s=read(p);
 s=rep(s,'assert.match(projection, /OAIS Preservation · Governance Projection/);\n  assert.match(projection, /AIP Coverage/);\n  assert.match(projection, /Fixity Failures/);\n  assert.match(projection, /Architecture Conformance/);','assert.match(projection, /حالة الحفظ والحوكمة/);\n  assert.match(projection, /تغطية حزم الحفظ/);\n  assert.match(projection, /إخفاقات التحقق/);\n  assert.match(projection, /architecture-conformance/);',p);
 write(p,s);
}
{
 const p='tests/media-vault-phase4.test.mjs'; let s=read(p);
 s=rep(s,'assert.match(ui, /Media Vault — خزنة الأصول/);','assert.match(ui, /خزنة الوسائط والأصول/);',p); write(p,s);
}
{
 const p='tests/rendered-html.test.mjs'; let s=read(p);
 s=rep(s,'assert.match(source, /data-import.lifecycle.v1/);','assert.match(source, /batch\\.lifecycle\\?\\.availableActions/);\n  assert.match(source, /DataImportLifecycleProjection/);',p);
 s=rep(s,'assert.match(mediaUi, /Media Vault — خزنة الأصول/);','assert.match(mediaUi, /خزنة الوسائط والأصول/);',p); write(p,s);
}

// Make the new UX test check visible constructs, not internal metadata tokens.
{
 const p='tests/data-center-v2-ux-conformance.test.mjs'; let s=read(p);
 const start=s.indexOf('test("V2 operator chrome is Arabic-first"');
 const end=s.indexOf('\n\ntest("V2 specialist handoffs',start);
 if(start<0||end<0)throw new Error('UX test markers missing');
 const replacement=`test("V2 operator chrome is Arabic-first", () => {\n  for (const legacy of [\n    ">Draft only<",\n    ">read-only<",\n    ">Imported / Rejected<",\n    ">no duplicate authority<",\n    ">Pending Technical Audit<",\n    ">Quarantine / Legal Hold<",\n    ">Disposal Requests<",\n    ">Contextual Inspector<",\n    ">Approve & Assign<",\n    ">Reject & Quarantine<",\n  ]) {\n    assert.equal(app.includes(legacy), false, \`V2 still exposes visible English: \${legacy}\`);\n    assert.equal(catalog.includes(legacy), false, \`Catalog still exposes visible English: \${legacy}\`);\n    assert.equal(media.includes(legacy), false, \`Media still exposes visible English: \${legacy}\`);\n  }\n  assert.match(app, /مركز البيانات V2/);\n  assert.match(catalog, /مسودة فقط/);\n});`;
 s=s.slice(0,start)+replacement+s.slice(end); write(p,s);
}
