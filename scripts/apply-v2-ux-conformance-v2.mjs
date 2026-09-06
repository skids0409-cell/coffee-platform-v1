import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
const replace = (s, from, to, p) => {
  if (!s.includes(from)) throw new Error(`missing marker in ${p}: ${from.slice(0, 100)}`);
  return s.split(from).join(to);
};

{
  const p = 'app/ui/admin/OperationsWorkspaceShell.tsx';
  let s = read(p);
  s = replace(s, 'import type { ReactNode } from "react";', 'import type { ReactNode } from "react";\nimport Link from "next/link";\nimport { usePathname } from "next/navigation";', p);
  s = replace(s, '  const visibleNavigation = navigation.filter(', '  const pathname = usePathname();\n  const isV2Specialist = pathname.startsWith("/operations/data-center-v2/specialist");\n  const visibleNavigation = navigation.filter(', p);
  s = replace(s, '  const activePanel = panels[workspace];\n\n  return (', '  const activePanel = panels[workspace];\n\n  if (isV2Specialist) {\n    const descriptor = operationsWorkspaceDescriptors[workspace];\n    return (\n      <div className="operations v2-specialist-shell" dir="rtl" data-v2-specialist-shell="true">\n        <header className="v2-specialist-header">\n          <div><span>مسار تشغيلي متخصص</span><h1>{descriptor.label}</h1><p>{descriptor.purpose}</p></div>\n          <Link href="/operations/data-center-v2?view=handoffs">العودة إلى مسارات الحوكمة</Link>\n        </header>\n        <main className="v2-specialist-panel" data-governed-inspector="true">\n          {activePanel ?? <section className="directory-state compact" role="status"><h3>الوحدة غير متاحة حالياً</h3><p>لم يتم تحميل المسار التشغيلي المطلوب.</p></section>}\n        </main>\n      </div>\n    );\n  }\n\n  return (', p);
  write(p, s);
}

{
  const p = 'app/ui/admin/data-center-v2/DataCenterV2App.tsx';
  let s = read(p);
  const pairs = [
    ['{ id: "catalog", label: "إدخال الكتالوج", description: "Master / Vendor / Content / Origin" }', '{ id: "catalog", label: "إدخال الكتالوج", description: "المنتجات والعروض والمحتوى والمنشأ" }'],
    ['{ id: "handoffs", label: "مسارات الحوكمة", description: "Review / Media / Search / Support" }', '{ id: "handoffs", label: "مسارات الحوكمة", description: "المراجعة والوسائط والبحث والدعم" }'],
    ['  const [confirmBusy, setConfirmBusy] = useState(false);', '  const [confirmBusy, setConfirmBusy] = useState(false);\n  const [csvFileName, setCsvFileName] = useState("لم يتم اختيار ملف");'],
    ['<strong>Data Center V2</strong>\n            <span>إعادة بناء مستقلة · Legacy Freeze</span>', '<strong>مركز البيانات V2</strong>\n            <span>إعادة بناء مستقلة · تجميد الواجهة السابقة</span>'],
    ['V2 · server-authoritative', 'V2 · محكوم من الخادم'],
    ['<b>Legacy Freeze مفعل:</b> المسار القديم باقٍ للرجوع التشغيلي فقط أثناء بناء التكافؤ. هذا المسار لا يستورد `DataCenterWorkspace` القديم ولا يعتمد على منطق UUID يدوي.', '<b>تجميد الواجهة السابقة مفعّل:</b> المسار السابق مخصص للرجوع الطارئ فقط. مركز البيانات V2 مستقل ولا يعتمد على الإدخال اليدوي للمعرّفات.'],
    ['<span className={styles.muted}>Imported / Rejected</span>', '<span className={styles.muted}>تم الاستيراد أو الرفض</span>'],
    ['<span className={styles.badge}>read-only</span>', '<span className={styles.badge}>للقراءة فقط</span>'],
    ['<label>ملف CSV<input name="csvFile" type="file" accept=".csv,text/csv" required /></label>', '<label>ملف CSV<span className={styles.filePicker}><span>{csvFileName}</span><span className={styles.fileButton}>اختيار ملف</span><input className={styles.fileInput} name="csvFile" type="file" accept=".csv,text/csv" required onChange={(event) => setCsvFileName(event.target.files?.[0]?.name || "لم يتم اختيار ملف")} /></span></label>'],
    ['formElement.reset();\n    setMessage("تم تجهيز الدفعة', 'formElement.reset();\n    setCsvFileName("لم يتم اختيار ملف");\n    setMessage("تم تجهيز الدفعة'],
    ['الأزرار أدناه ترسم `availableActions` من `data-import.lifecycle.v1` فقط.', 'الأزرار أدناه تظهر فقط الإجراءات التي يسمح بها عقد دورة الحياة الخادمي.'],
    ['<span className={styles.badge}>no duplicate authority</span>', '<span className={styles.badge}>بلا صلاحيات مكررة</span>'],
    ['href="/operations?workspace=review"', 'href="/operations/data-center-v2/specialist?workspace=review"'],
    ['href="/operations?workspace=media"', 'href="/operations/data-center-v2/specialist?workspace=media"'],
    ['href="/operations?workspace=search"', 'href="/operations/data-center-v2/specialist?workspace=search"'],
    ['href="/operations?workspace=requests"', 'href="/operations/data-center-v2/specialist?workspace=requests"'],
    ['href="/operations?workspace=archive"', 'href="/operations/data-center-v2/specialist?workspace=archive"'],
    ['href="/operations?workspace=taxonomy"', 'href="/operations/data-center-v2/specialist?workspace=taxonomy"'],
    ['<b>Search Governance</b>', '<b>حوكمة البحث</b>'],
    ['<b>Media Vault</b>', '<b>خزنة الوسائط</b>'],
    ['<b>Support Desk</b>', '<b>مكتب الدعم</b>'],
    ['<b>Archive</b>', '<b>الأرشيف</b>'],
    ['<b>Governed Taxonomy</b>', '<b>التصنيفات المحكومة</b>'],
  ];
  for (const [a,b] of pairs) s = replace(s,a,b,p);
  write(p,s);
}

{
  const p='app/ui/admin/data-center-v2/CatalogIntakeV2.tsx';
  let s=read(p);
  s=replace(s,'<span className={styles.badge}>Draft only</span>','<span className={styles.badge}>مسودة فقط</span>',p);
  write(p,s);
}

{
  const p='app/ui/admin/MediaVaultWorkspace.tsx';
  let s=read(p);
  const pairs=[
    ['{ key: "pending", title: "Pending Technical Audit", value: metrics.pending, note: "بانتظار الفحص التقني" }','{ key: "pending", title: "بانتظار الفحص التقني", value: metrics.pending, note: "لم يكتمل التدقيق التقني بعد" }'],
    ['{ key: "active", title: "Active", value: metrics.active, note: "جاهزة وآمنة للربط" }','{ key: "active", title: "نشطة", value: metrics.active, note: "جاهزة وآمنة للربط" }'],
    ['{ key: "quarantine", title: "Quarantine / Legal Hold", value: metrics.quarantine, note: "مدة احتفاظ قدرها 30 يوماً" }','{ key: "quarantine", title: "الحجر والحجز القانوني", value: metrics.quarantine, note: "مدة احتفاظ قدرها 30 يوماً" }'],
    ['{ key: "disposal", title: "Disposal Requests", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" }','{ key: "disposal", title: "طلبات الإتلاف", value: metrics.disposal, note: "مؤهلة أو بانتظار قرار" }'],
    ['Media Vault — خزنة الأصول','خزنة الوسائط والأصول'],
    ['>Legal Hold</div>','>حجز قانوني</div>'],
  ];
  for(const [a,b] of pairs) s=replace(s,a,b,p);
  write(p,s);
}

{
  const p='app/ui/admin/governance/MediaPreservationProjection.tsx';
  let s=read(p);
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
    ['<span>Canonical Phase</span>','<span>المرحلة المعتمدة</span>'],
  ];
  for(const [a,b] of pairs) if(s.includes(a)) s=s.split(a).join(b);
  write(p,s);
}

{
  const p='app/ui/admin/SupportWorkspace.tsx';
  let s=read(p);
  if(s.includes('<span className="eyebrow">Support Desk</span>')) s=s.replace('<span className="eyebrow">Support Desk</span>','<span className="eyebrow">مكتب الدعم</span>');
  write(p,s);
}

{
  const p='app/globals.css';
  let s=read(p);
  if(!s.includes('/* Data Center V2 UX Conformance */')) s += `\n\n/* Data Center V2 UX Conformance */\n.v2-specialist-shell{max-width:1180px;margin:0 auto;padding:24px;direction:rtl;background:#fbf8f3;min-height:100vh}\n.v2-specialist-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:18px;padding:20px 22px;border:1px solid #dfd4c5;border-radius:16px;background:#fff}\n.v2-specialist-header span{font-size:12px;font-weight:800;color:#2f5d46}.v2-specialist-header h1{margin:4px 0 0;font-size:26px}.v2-specialist-header p{margin:5px 0 0;color:#756b63}.v2-specialist-header a{border:1px solid #cdbca8;border-radius:10px;padding:10px 14px;background:#fffaf3;font-weight:800}.v2-specialist-panel{display:block}.v2-specialist-panel .eyebrow{letter-spacing:0;text-transform:none}@media(max-width:760px){.v2-specialist-shell{padding:12px}.v2-specialist-header{align-items:stretch;flex-direction:column}.v2-specialist-header a{text-align:center}}\n`;
  write(p,s);
}

{
  const p='app/ui/admin/data-center-v2/DataCenterV2.module.css';
  let s=read(p);
  if(!s.includes('.filePicker')) s += `\n.filePicker{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:46px;padding:8px 10px;border:1px solid #d8c8b5;border-radius:10px;background:#fff;overflow:hidden}.fileButton{flex:0 0 auto;padding:8px 14px;border-radius:8px;background:#2f5d46;color:#fff;font-weight:800}.fileInput{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}\n`;
  write(p,s);
}
