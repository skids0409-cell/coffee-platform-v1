import fs from 'node:fs';

function read(path){ return fs.readFileSync(path,'utf8'); }
function write(path, value){ fs.writeFileSync(path,value); }
function replaceAllStrict(source, pairs, path){
  for (const [from,to] of pairs){
    if (!source.includes(from)) throw new Error(`missing marker in ${path}: ${from.slice(0,100)}`);
    source = source.split(from).join(to);
  }
  return source;
}

// 1) Keep specialist workspaces inside a compact V2 shell.
{
  const path='app/ui/admin/OperationsWorkspaceShell.tsx';
  let s=read(path);
  s=replaceAllStrict(s, [
    ['import type { ReactNode } from "react";','import type { ReactNode } from "react";\nimport Link from "next/link";\nimport { usePathname } from "next/navigation";'],
    ['  const visibleNavigation = navigation.filter(','  const pathname = usePathname();\n  const isV2Specialist = pathname.startsWith("/operations/data-center-v2/specialist");\n  const visibleNavigation = navigation.filter('],
    ['  const activePanel = panels[workspace];\n\n  return (','  const activePanel = panels[workspace];\n\n  if (isV2Specialist) {\n    const descriptor = operationsWorkspaceDescriptors[workspace];\n    return (\n      <div className="operations v2-specialist-shell" dir="rtl" data-v2-specialist-shell="true">\n        <header className="v2-specialist-header">\n          <div>\n            <span>مسار تشغيلي متخصص</span>\n            <h1>{descriptor.label}</h1>\n            <p>{descriptor.purpose}</p>\n          </div>\n          <Link href="/operations/data-center-v2?view=handoffs">العودة إلى مسارات الحوكمة</Link>\n        </header>\n        <main className="v2-specialist-panel" data-governed-inspector="true">\n          {activePanel ?? <section className="directory-state compact" role="status"><h3>الوحدة غير متاحة حالياً</h3><p>لم يتم تحميل المسار التشغيلي المطلوب.</p></section>}\n        </main>\n      </div>\n    );\n  }\n\n  return (']
  ], path);
  write(path,s);
}

// 2) Arabic-first V2 copy, custom file picker, specialist handoffs.
{
  const path='app/ui/admin/data-center-v2/DataCenterV2App.tsx';
  let s=read(path);
  s=replaceAllStrict(s, [
    ['{ id: "catalog", label: "إدخال الكتالوج", description: "Master / Vendor / Content / Origin" }','{ id: "catalog", label: "إدخال الكتالوج", description: "المنتجات والعروض والمحتوى والمنشأ" }'],
    ['{ id: "handoffs", label: "مسارات الحوكمة", description: "Review / Media / Search / Support" }','{ id: "handoffs", label: "مسارات الحوكمة", description: "المراجعة والوسائط والبحث والدعم" }'],
    ['  const [confirmBusy, setConfirmBusy] = useState(false);','  const [confirmBusy, setConfirmBusy] = useState(false);\n  const [csvFileName, setCsvFileName] = useState("لم يتم اختيار ملف");'],
    ['<strong>Data Center V2</strong>\n            <span>إعادة بناء مستقلة · Legacy Freeze</span>','<strong>مركز البيانات V2</strong>\n            <span>إعادة بناء مستقلة · تجميد الواجهة السابقة</span>'],
    ['V2 · server-authoritative','V2 · محكوم من الخادم'],
    ['<b>Legacy Freeze مفعل:</b> المسار القديم باقٍ للرجوع التشغيلي فقط أثناء بناء التكافؤ. هذا المسار لا يستورد `DataCenterWorkspace` القديم ولا يعتمد على منطق UUID يدوي.','<b>تجميد الواجهة السابقة مفعّل:</b> المسار السابق مخصص للرجوع الطارئ فقط. مركز البيانات V2 مستقل ولا يعتمد على الإدخال اليدوي للمعرّفات.'],
    ['<span className={styles.muted}>Imported / Rejected</span>','<span className={styles.muted}>تم الاستيراد أو الرفض</span>'],
    ['<span className={styles.badge}>read-only</span>','<span className={styles.badge}>للقراءة فقط</span>'],
    ['<label>ملف CSV<input name="csvFile" type="file" accept=".csv,text/csv" required /></label>','<label>ملف CSV<span className={styles.filePicker}><span>{csvFileName}</span><span className={styles.fileButton}>اختيار ملف</span><input className={styles.fileInput} name="csvFile" type="file" accept=".csv,text/csv" required onChange={(event) => setCsvFileName(event.target.files?.[0]?.name || "لم يتم اختيار ملف")} /></span></label>'],
    ['formElement.reset();\n    setMessage("تم تجهيز الدفعة','formElement.reset();\n    setCsvFileName("لم يتم اختيار ملف");\n    setMessage("تم تجهيز الدفعة'],
    ['الأزرار أدناه ترسم `availableActions` من `data-import.lifecycle.v1` فقط.','الأزرار أدناه تظهر فقط الإجراءات التي يسمح بها عقد دورة الحياة الخادمي.'],
    ['<span className={styles.badge}>no duplicate authority</span>','<span className={styles.badge}>بلا صلاحيات مكررة</span>'],
    ['href="/operations?workspace=review"','href="/operations/data-center-v2/specialist?workspace=review"'],
    ['href="/operations?workspace=media"','href="/operations/data-center-v2/specialist?workspace=media"'],
    ['href="/operations?workspace=search"','href="/operations/data-center-v2/specialist?workspace=search"'],
    ['href="/operations?workspace=requests"','href="/operations/data-center-v2/specialist?workspace=requests"'],
    ['href="/operations?workspace=archive"','href="/operations/data-center-v2/specialist?workspace=archive"'],
    ['href="/operations?workspace=taxonomy"','href="/operations/data-center-v2/specialist?workspace=taxonomy"'],
    ['<b>Search Governance</b>','<b>حوكمة البحث</b>'],
    ['<b>Media Vault</b>','<b>خزنة الوسائط</b>'],
    ['<b>Support Desk</b>','<b>مكتب الدعم</b>'],
    ['<b>Archive</b>','<b>الأرشيف</b>'],
    ['<b>Governed Taxonomy</b>','<b>التصنيفات المحكومة</b>'],
    ['<b>قاعدة الموازنة:</b>','<b>قاعدة المزامنة:</b>']
  ], path);
  write(path,s);
}

// 3) Arabic-first catalog intake badges.
{
  const path='app/ui/admin/data-center-v2/CatalogIntakeV2.tsx';
  let s=read(path);
  s=replaceAllStrict(s,[['<span className={styles.badge}>Draft only</span>','<span className={styles.badge}>مسودة فقط</span>']],path);
  write(path,s);
}

// 4) Arabic-first Media Vault visible terminology.
{
  const path='app/ui/admin/MediaVaultWorkspace.tsx';
  let s=read(path);
  s=replaceAllStrict(s,[
    ['{ key: "pending", title: "Pending Technical Audit", value: metrics.pending, note: "بانتظار الفحص التقني" }','{ key: "pending", title: "بانتظار الفحص التقني", value: metrics.pending, note: "لم يكتمل التدقيق التقني بعد" }'],
    ['{ key: "active", title: "Active", value: metrics.active, note: "جاهزة وآمنة للربط" }','{ key: "active", title: "نشطة", value: metrics.active, note: "جاهزة وآمنة للربط" }'],
    ['{ key: "quarantine", title: "Quarantine / Legal Hold", value: metrics.quarantine, note: "مدة احتفاظ قدرها 30 يوماً" }','{ key: "quarantine", title: "الحجر والحجز القانوني", value: metrics.quarantine, note: "مدة احتفاظ قدرها 30 يوماً" }'],
    ['{ key: "disposal", title: "Disposal Requests", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" }','{ key: "disposal", title: "طلبات الإتلاف", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" }'],
    ['Media Vault — خزنة الأصول','خزنة الوسائط والأصول'],
    ['>Legal Hold</div>','>حجز قانوني</div>']
  ],path);
  write(path,s);
}

// 5) Arabic-first preservation status and inspector.
{
  const path='app/ui/admin/governance/MediaPreservationProjection.tsx';
  let s=read(path);
  const pairs=[
    ['const fixityLabel = (value: string | null) => value === "success" ? "Verified" : value === "failure" ? "FAILED" : "Not verified";','const fixityLabel = (value: string | null) => value === "success" ? "تم التحقق" : value === "failure" ? "فشل التحقق" : "لم يتم التحقق";'],
    ['OAIS Preservation · Governance Projection','حالة الحفظ والحوكمة'],
    ['حالة الحفظ وFixity من واجهة OAIS الرسمية','حالة الحفظ والتحقق من سلامة الملفات من واجهة OAIS الرسمية'],
    ['"CONFORMANCE UNAVAILABLE"','"التوافق غير متاح"'],
    ['label="AIP Coverage"','label="تغطية حزم الحفظ"'],
    ['label="Fixity Failures"','label="إخفاقات التحقق"'],
    ['`${conformance.passedRules}/${conformance.totalRules} PASS`','`${conformance.passedRules}/${conformance.totalRules} ناجح`'],
    ['حدد أصلاً واحداً في Media Vault لعرض OAIS / Fixity لنفس الأصل.','حدد أصلاً واحداً في خزنة الوسائط لعرض بيانات الحفظ والتحقق من سلامة الملف.'],
    ['جارٍ تحميل OAIS Preservation…','جارٍ تحميل بيانات الحفظ…'],
    ['Preservation & Governance','الحفظ والحوكمة'],
    ['<h4 className="font-black">OAIS / Fixity</h4>','<h4 className="font-black">الحفظ والتحقق من السلامة</h4>'],
    ['<b>Lifecycle</b>','<b>دورة الحياة</b>'],
    ['<span>Canonical Phase</span>','<span>المرحلة المعتمدة</span>']
  ];
  for (const [from,to] of pairs) if (s.includes(from)) s=s.split(from).join(to);
  write(path,s);
}

// 6) Remove English eyebrow from support.
{
  const path='app/ui/admin/SupportWorkspace.tsx';
  let s=read(path);
  if (s.includes('<span className="eyebrow">Support Desk</span>')) s=s.replace('<span className="eyebrow">Support Desk</span>','<span className="eyebrow">مكتب الدعم</span>');
  write(path,s);
}

// 7) Consistent V2 specialist and custom file-picker styling.
{
  const path='app/globals.css';
  let s=read(path);
  if (!s.includes('/* Data Center V2 UX Conformance */')) s += `\n\n/* Data Center V2 UX Conformance */\n.v2-specialist-shell{max-width:1180px;margin:0 auto;padding:24px;direction:rtl;background:#fbf8f3;min-height:100vh}\n.v2-specialist-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px;padding:20px 22px;border:1px solid #dfd4c5;border-radius:16px;background:#fff}\n.v2-specialist-header span{font-size:12px;font-weight:800;color:#2f5d46}\n.v2-specialist-header h1{margin:4px 0 0;font-size:26px}\n.v2-specialist-header p{margin:5px 0 0;color:#756b63}\n.v2-specialist-header a{border:1px solid #cdbca8;border-radius:10px;padding:10px 14px;background:#fffaf3;font-weight:800}\n.v2-specialist-panel{display:block}\n.v2-specialist-panel>.operations-workspace-nav,.v2-specialist-panel .operations-workspace-nav{display:none!important}\n.v2-specialist-panel .eyebrow{letter-spacing:0;text-transform:none}\n@media(max-width:760px){.v2-specialist-shell{padding:12px}.v2-specialist-header{align-items:stretch;flex-direction:column}.v2-specialist-header a{text-align:center}}\n`;
  write(path,s);
}

// 8) DataCenterV2 module styles for custom file input and better RTL density.
{
  const path='app/ui/admin/data-center-v2/DataCenterV2.module.css';
  let s=read(path);
  if (!s.includes('.filePicker')) s += `\n.filePicker{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;padding:8px 10px;border:1px solid #d8c8b5;border-radius:10px;background:#fff;overflow:hidden}\n.fileButton{flex:0 0 auto;padding:8px 14px;border-radius:8px;background:#2f5d46;color:#fff;font-weight:800}\n.fileInput{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}\n`;
  write(path,s);
}

// 9) Regression test for Arabic-first V2 and specialist isolation.
{
  const path='tests/data-center-v2-ux-conformance.test.mjs';
  write(path,`import test from "node:test";\nimport assert from "node:assert/strict";\nimport fs from "node:fs";\n\nconst app=fs.readFileSync("app/ui/admin/data-center-v2/DataCenterV2App.tsx","utf8");\nconst catalog=fs.readFileSync("app/ui/admin/data-center-v2/CatalogIntakeV2.tsx","utf8");\nconst shell=fs.readFileSync("app/ui/admin/OperationsWorkspaceShell.tsx","utf8");\nconst media=fs.readFileSync("app/ui/admin/MediaVaultWorkspace.tsx","utf8");\n\ntest("V2 operator-facing chrome is Arabic-first",()=>{\n  for(const legacy of ["Data Center V2","Legacy Freeze","Draft only","read-only","Imported / Rejected","no duplicate authority","Pending Technical Audit","Quarantine / Legal Hold","Disposal Requests"]) {\n    assert.doesNotMatch(app,new RegExp(legacy.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")));\n    assert.doesNotMatch(catalog,new RegExp(legacy.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")));\n    assert.doesNotMatch(media,new RegExp(legacy.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\\\$&")));\n  }\n  assert.match(app,/مركز البيانات V2/);\n  assert.match(catalog,/مسودة فقط/);\n});\n\ntest("V2 specialist handoffs do not re-enter the legacy operations shell",()=>{\n  for(const workspace of ["review","media","search","requests","archive","taxonomy"]) assert.match(app,new RegExp(`/operations/data-center-v2/specialist\\\\?workspace=${workspace}`));\n  assert.match(shell,/data-v2-specialist-shell/);\n  assert.match(shell,/العودة إلى مسارات الحوكمة/);\n});\n`);
}
