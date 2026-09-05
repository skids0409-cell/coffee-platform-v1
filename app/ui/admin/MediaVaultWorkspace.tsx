"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState } from "react";

type VaultLink = { id:string;entity_type:string;entity_id:string;target_label?:string;role:string;is_primary:boolean;alt_ar:string;caption_ar:string|null;link_status:string;linked_at:string };
type VaultRight = { id:string;rights_basis:string;copyright_owner:string;source_url:string|null;license_url:string|null;commercial_use_allowed:boolean;modification_allowed:boolean;attestation_version:string;attested_at:string;review_status:string;review_note:string|null;created_at:string };
type VaultEvent = { id:number;event_type:string;previous_state:string|null;next_state:string;policy_version:string;created_at:string;technical_report:Record<string,unknown> };
type PurgeRequest = { id:string;reason:string;status:string;requested_at:string;review_note:string|null;execution_started_at?:string|null };
type VaultAsset = {
  id:string;purpose:string;original_storage_path:string;sanitized_storage_path:string|null;published_storage_path:string|null;
  original_filename:string;declared_mime:string;detected_mime:string|null;byte_size:number|null;width:number|null;height:number|null;
  pixel_count:number|null;page_count:number|null;sha256_hex:string|null;duplicate_of_asset_id:string|null;technical_status:string;
  publication_status:string;rejection_codes:string[];technical_report:Record<string,unknown>;legal_hold:boolean;validated_at:string|null;
  approved_at:string|null;published_at:string|null;restricted_at:string|null;quarantine_started_at:string|null;retention_expires_at:string|null;
  retention_days_remaining:number|null;lifecycle_state:string;public_eligible:boolean;purge_request_id:string|null;purge_request_status:string|null;
  created_at:string;updated_at:string;preview_url:string|null;
  links:VaultLink[];rights:VaultRight[];events:VaultEvent[];purge_requests:PurgeRequest[];
};
type VaultSummary = { total:number;quarantined:number;orphans:number;duplicates:number;missingRights:number;technicalReview:number;legalHolds:number;active:number;retention:number;disposalEligible:number;disposalQueue:number };
type QueueKey = "all"|"active"|"quarantine"|"eligible"|"orphan"|"duplicate"|"rights"|"validation"|"purge";

const queueLabels: Array<[QueueKey,string,keyof VaultSummary|null]> = [
  ["all","كل الأصول","total"],
  ["active","نشطة وآمنة","active"],
  ["quarantine","الحجر","quarantined"],
  ["eligible","مؤهلة للإتلاف","disposalEligible"],
  ["orphan","غير مرتبطة","orphans"],
  ["duplicate","المكررات","duplicates"],
  ["rights","نواقص الحقوق","missingRights"],
  ["validation","بانتظار الفحص التقني","technicalReview"],
  ["purge","طلبات الإتلاف","disposalQueue"],
];
const purposeLabels:Record<string,string>={master_product:"منتج رئيسي",vendor_offer:"عرض بائع",organization_profile:"صفحة جهة",brand_identity:"هوية علامة",editorial:"تحريري",origin_evidence:"دليل منشأ",document_evidence:"مستند إثبات"};
const statusLabels:Record<string,string>={private:"خاص",ready_for_review:"بانتظار الاعتماد",publishing:"جارٍ النشر",published:"منشور",restricted:"مقيّد",quarantined:"في الحجر",rejected:"مرفوض",archived:"مؤرشف",validating:"بانتظار الفحص التقني",passed:"سليم تقنياً",duplicate:"مكرر",pending_technical_audit:"بانتظار التدقيق التقني",technical_rejected:"مرفوض تقنياً",duplicate_review:"مراجعة التكرار",pending_approval:"بانتظار الاعتماد",active:"نشط وآمن",quarantine_retention:"حجر — مدة الاحتفاظ",legal_hold:"حجز قانوني",disposal_eligible:"مؤهل لطلب الإتلاف",disposal_requested:"طلب إتلاف قيد المراجعة",disposal_approved:"مصرّح بالإتلاف",disposal_executing:"جارٍ الإتلاف"};
const purgeStatusLabels:Record<string,string>={pending:"قيد المراجعة",approved:"مقبول للتنفيذ",rejected:"مرفوض",cancelled:"ملغى",executing:"جارٍ حذف الملفات",executed:"نُفّذ الإتلاف"};
const activeLinks=(asset:VaultAsset)=>asset.links.filter((link)=>["active","pending"].includes(link.link_status));
const latestRights=(asset:VaultAsset)=>[...asset.rights].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
const bytes=(value:number|null)=>value===null?"—":value>=1048576?`${(value/1048576).toFixed(2)} MB`:`${Math.ceil(value/1024)} KB`;
const shortHash=(value:string|null)=>value?`${value.slice(0,12)}…${value.slice(-8)}`:"غير محسوبة";
const retentionDaysRemaining=(asset:VaultAsset)=>asset.retention_days_remaining??(asset.retention_expires_at?Math.max(0,Math.ceil((new Date(asset.retention_expires_at).getTime()-Date.now())/86400000)):30);

export function MediaVaultWorkspace({onOpen,onUnauthorized}:{onOpen:(record:{entity:string;id:string})=>void;onUnauthorized:()=>void}){
  const [assets,setAssets]=useState<VaultAsset[]>([]);
  const [summary,setSummary]=useState<VaultSummary>({total:0,quarantined:0,orphans:0,duplicates:0,missingRights:0,technicalReview:0,legalHolds:0,active:0,retention:0,disposalEligible:0,disposalQueue:0});
  const [role,setRole]=useState("");
  const [state,setState]=useState<"loading"|"ready"|"error">("loading");
  const [queue,setQueue]=useState<QueueKey>("all");
  const [layout,setLayout]=useState<"grid"|"list">("grid");
  const [mime,setMime]=useState("all");
  const [integrity,setIntegrity]=useState("all");
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
  const [inspectedId,setInspectedId]=useState("");
  const [working,setWorking]=useState(false);
  const [reconciling,setReconciling]=useState(false);
  const [message,setMessage]=useState("");
  const [showMetadata,setShowMetadata]=useState(false);

  const load=useCallback(async()=>{
    try{
      const response=await fetch("/api/admin/media-vault",{cache:"no-store",credentials:"same-origin"});
      if(response.status===401){onUnauthorized();return;}
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.reason||"load_failed");
      setAssets(result.assets||[]);setSummary(result.summary||{});setRole(result.role||"");setState("ready");
      setInspectedId((current)=>current&&(result.assets||[]).some((asset:VaultAsset)=>asset.id===current)?current:(result.assets?.[0]?.id||""));
      setSelected((current)=>current.filter((id)=>(result.assets||[]).some((asset:VaultAsset)=>asset.id===id)));
    }catch{setState("error");}
  },[onUnauthorized]);
  useEffect(()=>{const handle=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(handle);},[load]);

  const mimes=useMemo(()=>[...new Set(assets.map((asset)=>asset.detected_mime||asset.declared_mime).filter(Boolean))].sort(),[assets]);
  const visible=useMemo(()=>assets.filter((asset)=>{
    const rights=latestRights(asset);const links=activeLinks(asset);const pendingPurge=["disposal_requested","disposal_approved","disposal_executing"].includes(asset.lifecycle_state);
    const queueMatch=queue==="all"||
      (queue==="active"&&asset.lifecycle_state==="active")||
      (queue==="quarantine"&&["quarantined","restricted"].includes(asset.publication_status))||
      (queue==="eligible"&&asset.lifecycle_state==="disposal_eligible")||
      (queue==="orphan"&&links.length===0)||
      (queue==="duplicate"&&(asset.technical_status==="duplicate"||Boolean(asset.duplicate_of_asset_id)))||
      (queue==="rights"&&!rights)||
      (queue==="validation"&&asset.technical_status==="validating")||
      (queue==="purge"&&pendingPurge);
    const mimeMatch=mime==="all"||(asset.detected_mime||asset.declared_mime)===mime;
    const integrityMatch=integrity==="all"||
      (integrity==="missing_checksum"&&!asset.sha256_hex)||
      (integrity==="missing_dimensions"&&asset.detected_mime!=="application/pdf"&&(!asset.width||!asset.height))||
      (integrity==="rejected"&&asset.technical_status==="rejected")||
      (integrity==="legal_hold"&&asset.legal_hold);
    const haystack=[asset.original_filename,asset.sha256_hex,asset.purpose,...asset.links.map((link)=>link.target_label||link.entity_id),rights?.copyright_owner,rights?.source_url].filter(Boolean).join(" ").toLocaleLowerCase("ar-IQ");
    return queueMatch&&mimeMatch&&integrityMatch&&(!query.trim()||haystack.includes(query.trim().toLocaleLowerCase("ar-IQ")));
  }),[assets,integrity,mime,query,queue]);
  const inspected=assets.find((asset)=>asset.id===inspectedId)||null;
  const inspectedLink=inspected?(activeLinks(inspected)[0]||inspected.links.find((link)=>link.link_status!=="removed")||null):null;
  const allVisibleSelected=visible.length>0&&visible.every((asset)=>selected.includes(asset.id));
  const selectedAssets=assets.filter((asset)=>selected.includes(asset.id));
  const canReview=["verifier","admin"].includes(role);const canAdmin=role==="admin";
  const purgeBlockers=useMemo(()=>{
    if(!selectedAssets.length)return [];
    const blockers:string[]=[];
    if(selectedAssets.some((asset)=>asset.legal_hold))blockers.push("يوجد حجز قانوني يمنع الإتلاف");
    if(selectedAssets.some((asset)=>asset.publication_status!=="quarantined"))blockers.push("يجب حجر الأصل أولاً");
    const remaining=Math.max(...selectedAssets.map(retentionDaysRemaining));
    if(remaining>0)blockers.push(`باقي ${remaining} يوم من مدة الاحتفاظ`);
    if(selectedAssets.some((asset)=>activeLinks(asset).length>0))blockers.push("توجد روابط نشطة");
    if(selectedAssets.some((asset)=>asset.purge_requests.some((request)=>["pending","approved","executing"].includes(request.status))))blockers.push("يوجد طلب إتلاف مفتوح");
    return blockers;
  },[selectedAssets]);

  const act=async(action:string,payload:Record<string,unknown>={})=>{
    if(!selected.length)return;setWorking(true);setMessage("");
    const affectedIds=[...selected];
    const response=await fetch("/api/admin/media-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,assetIds:selected,payload})});
    const result=await response.json().catch(()=>({}));setWorking(false);
    if(!response.ok){const labels:Record<string,string>={reviewer_required:"هذه العملية تحتاج مدققاً أو مديراً.",admin_required:"فصل الروابط وطلبات الإتلاف متاحان للمدير فقط.",quarantine_reason_required:"اكتب سبباً واضحاً للحجر.",active_record_links_block_quarantine:"لا يمكن حجر أصل مرتبط بسجل منشور. افصل الصورة من السجل أو حدّث حالة السجل أولاً.",legal_hold_blocks_purge:"Legal hold يمنع طلب الإتلاف.",legal_hold_blocks_restore:"لا يمكن الاستعادة قبل إغلاق الحجز القانوني.",retention_period_active:"مدة الاحتفاظ 30 يوماً لم تكتمل.",active_links_block_purge:"افصل الروابط النشطة أولاً.",quarantine_required_before_purge:"يجب حجر الأصل قبل طلب الإتلاف.",asset_not_quarantined:"الاستعادة متاحة للأصول المحجورة فقط.",pending_purge_request_missing:"لا يوجد طلب إتلاف قيد المراجعة.",asset_not_disposal_eligible:"الأصل غير مؤهل للإتلاف.",review_note_required:"اكتب سبب رفض واضحاً."};setMessage(labels[result.reason]||`تعذر تنفيذ العملية: ${result.reason||"خطأ غير معروف"}`);return;}
    const affected=result.result?.affected||selected.length;
    const messages:Record<string,string>={
      update_metadata:`حُفظ وصف وبيانات ${affected} أصل. ستظهر القيم في لوحة تفاصيل الأصل؛ هذه العملية لا تشغّل الفحص التقني.`,
      quarantine:`حُجر ${affected} أصل وأُوقفت روابطه وبدأت مدة الاحتفاظ النظامية (30 يوماً).`,
      restore:`استُعيد ${affected} أصل من الحجر وسُجّلت العملية.`,
      unlink:`فُصلت روابط ${affected} أصل من السجلات، ولم يُحذف ملف التخزين.`,
      request_purge:`أُنشئ طلب إتلاف لـ${affected} أصل بحالة «قيد المراجعة». انتقلت إلى قائمة طلبات الإتلاف.`,
      approve_purge:`اعتمد المدير ${affected} طلب إتلاف. أصبح التنفيذ النهائي متاحاً.`,
      reject_purge:`رُفض ${affected} طلب إتلاف مع حفظ الملاحظة في سجل التدقيق.`,
    };
    setMessage(messages[action]||`تم تنفيذ العملية على ${affected} أصل وسُجّلت في سجل التدقيق.`);
    if(action==="request_purge"){setQueue("purge");setInspectedId(affectedIds[0]||"");}
    setSelected([]);setShowMetadata(false);await load();
  };
  const quarantine=()=>{const reason=window.prompt("اكتب سبب الحجر ليظهر في سجل التدقيق:");if(reason?.trim())void act("quarantine",{reason:reason.trim()});};
  const unlink=()=>{if(window.confirm("سيتم فصل الروابط فقط. لن يُحذف الأصل أو ملف التخزين. هل تتابع؟"))void act("unlink",{reason:"manual_unlink_from_independent_vault"});};
  const requestPurge=()=>{const reason=window.prompt("هذا طلب إتلاف فقط ولا يحذف الملف. اكتب السبب (10 أحرف على الأقل):");if(reason&&reason.trim().length>=10)void act("request_purge",{reason:reason.trim()});};
  const reviewPurge=async(asset:VaultAsset,action:"approve_purge"|"reject_purge")=>{
    const note=window.prompt(action==="approve_purge"?"ملاحظة الاعتماد (اختيارية):":"اكتب سبب الرفض (5 أحرف على الأقل):")||"";
    if(action==="reject_purge"&&note.trim().length<5)return;
    setSelected([asset.id]);await new Promise((resolve)=>window.setTimeout(resolve,0));
    setWorking(true);setMessage("");
    const response=await fetch("/api/admin/media-vault",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,assetIds:[asset.id],payload:{review_note:note.trim()}})});
    const result=await response.json().catch(()=>({}));setWorking(false);
    setMessage(response.ok?(action==="approve_purge"?"اعتمد طلب الإتلاف وأصبح جاهزاً للتنفيذ النهائي.":"رُفض الطلب وحُفظ السبب."):`تعذر تحديث الطلب: ${result.reason||"خطأ غير معروف"}`);
    setSelected([]);await load();
  };
  const executePurge=async(requestId:string)=>{
    if(!window.confirm("سيُحذف الأصل نهائياً من التخزين وقاعدة البيانات مع إبقاء سجل تدقيق غير قابل للتعديل. هل تتابع؟"))return;
    setWorking(true);setMessage("");
    const response=await fetch("/api/admin/media-vault/purge",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({requestId})});
    const result=await response.json().catch(()=>({}));setWorking(false);
    setMessage(response.ok?"اكتمل الإتلاف النهائي وحُفظت بصمة العملية في سجل التدقيق.":`تعذر الإتلاف النهائي: ${result.reason||"خطأ غير معروف"}`);
    await load();
  };
  const saveMetadata=(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);void act("update_metadata",{alt_ar:form.get("altAr"),caption_ar:form.get("captionAr"),operator_note:form.get("operatorNote")});};
  const reconcileLegacy=async()=>{
    setReconciling(true);setMessage("");
    try{
      const response=await fetch("/api/admin/media/reconcile-legacy",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
      if(response.status===401){onUnauthorized();return;}
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.reason||"reconciliation_failed");
      const counts=result.counts||{};
      const summaryText=[counts.passed?`${counts.passed} سليم`:"",counts.duplicate?`${counts.duplicate} مكرر`:"",counts.rejected?`${counts.rejected} مرفوض`:""].filter(Boolean).join("، ")||"لا توجد أصول معلقة";
      setMessage(`اكتمل التدقيق الفعلي: ${summaryText}${result.failed?.length?`، وتعذر ${result.failed.length}`:""}. لم تُنشأ ادعاءات حقوق تلقائية.`);
      await load();setQueue(result.failed?.length?"validation":"all");
    }catch(error){setMessage(`تعذر تشغيل تدقيق الأصول القديمة: ${error instanceof Error?error.message:"خطأ غير معروف"}`);}
    finally{setReconciling(false);}
  };

  if(state==="loading")return <section className="media-vault-shell"><p role="status">جارٍ تحميل الأصول من Media Vault…</p></section>;
  if(state==="error")return <section className="media-vault-shell directory-state"><h2>تعذر تحميل Media Vault</h2><p>لم تُعرض بيانات تخمينية. أعد المحاولة بعد فحص الاتصال.</p><button type="button" onClick={()=>{setState("loading");void load();}}>إعادة المحاولة</button></section>;
  return <section className="media-vault-shell" id="operations-media">
    <header className="media-vault-head"><div><span className="eyebrow">Independent DAM Workspace</span><h2>Media Vault — خزنة الأصول</h2><p>إدارة الملفات والحقوق والسلامة والروابط ودورة الحياة. التصنيف ليس الهيكل الرئيسي لهذه الخزنة.</p></div><div className="media-vault-view"><button type="button" className={layout==="grid"?"active":""} onClick={()=>setLayout("grid")}>شبكة</button><button type="button" className={layout==="list"?"active":""} onClick={()=>setLayout("list")}>قائمة</button></div></header>
    <section className="media-vault-guide" aria-label="طريقة استخدام خزنة الأصول"><b>دورة حياة الأصل المغلقة</b><ol><li>الرفع يحسب SHA-256 والنوع والأبعاد ويضع الأصل في التدقيق التقني.</li><li>لا يصبح الأصل «نشطاً وآمناً» إلا بعد نجاح الفحص، اعتماد الحقوق، وربطه بسجل منشور.</li><li>الحجر محظور أثناء الارتباط بسجل منشور؛ افصل الصورة أو حدّث السجل أولاً. الحجز القانوني استثناء إلزامي يعطّل العرض العام فوراً.</li><li>بعد الحجر تبدأ مدة احتفاظ قدرها 30 يوماً محسوبة من الخادم. بعدها يُنشأ طلب، يراجعه المدير، ثم ينفّذ حذف التخزين والبيانات مع Tombstone دائم في سجل التدقيق.</li></ol><p>لا يوجد حذف دائم من نتائج البحث أو محرر السجل. الفلاتر أدناه تقرأ الحالة الرسمية نفسها من قاعدة البيانات. التدقيق لا يخترع إثبات حقوق؛ بل يتطلب إقراراً ومراجعة موثقين.</p>{summary.technicalReview>0&&<button type="button" disabled={!canReview||reconciling||working} onClick={()=>void reconcileLegacy()}>{reconciling?"جارٍ تدقيق الأصول القديمة…":`تدقيق الأصول القديمة (${summary.technicalReview})`}</button>}</section>
    <div className="media-vault-stats"><span><b>{summary.total}</b>أصل</span><span><b>{summary.active}</b>نشط وآمن</span><span><b>{summary.retention}</b>ضمن مهلة 30 يوماً</span><span><b>{summary.disposalEligible}</b>مؤهل للإتلاف</span><span><b>{summary.orphans}</b>بلا رابط</span><span><b>{summary.missingRights}</b>حقوق ناقصة</span><span><b>{summary.technicalReview}</b>فحص تقني</span><span><b>{summary.legalHolds}</b>Legal hold</span></div>
    <nav className="media-vault-queues" aria-label="قوائم Media Vault">{queueLabels.map(([key,label,count])=><button type="button" key={key} className={queue===key?"active":""} onClick={()=>setQueue(key)}>{label}<b>{count?summary[count]:assets.filter((asset)=>asset.purge_requests.some((item)=>item.status==="pending")).length}</b></button>)}</nav>
    <div className="media-vault-filters"><label>بحث في الأصول<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="اسم الملف، SHA-256، الجهة أو المصدر" /></label><label>نوع الملف<select value={mime} onChange={(event)=>setMime(event.target.value)}><option value="all">كل الأنواع</option>{mimes.map((value)=><option key={value}>{value}</option>)}</select></label><label>سلامة البيانات<select value={integrity} onChange={(event)=>setIntegrity(event.target.value)}><option value="all">كل حالات السلامة</option><option value="missing_checksum">بلا SHA-256</option><option value="missing_dimensions">بلا أبعاد</option><option value="rejected">فشل تقني</option><option value="legal_hold">Legal hold</option></select></label></div>
    <div className="media-vault-selection"><label><input type="checkbox" checked={allVisibleSelected} onChange={(event)=>setSelected(event.target.checked?visible.map((asset)=>asset.id):[])} /> تحديد النتائج الظاهرة</label><span>{selected.length} محدد</span><button type="button" disabled={!selected.length||working} onClick={()=>setShowMetadata(true)}>تعديل الوصف والبيانات</button><button type="button" disabled={!selected.length||working||!canReview} onClick={quarantine}>حجر الأصل</button><button type="button" disabled={!selected.length||working||!canReview||selectedAssets.some((asset)=>asset.publication_status!=="quarantined")} onClick={()=>void act("restore")}>استعادة</button><button type="button" disabled={!selected.length||working||!canAdmin} onClick={unlink}>فصل الروابط</button><button type="button" className="danger-action" disabled={!selected.length||working||!canAdmin||purgeBlockers.length>0} onClick={requestPurge}>إنشاء طلب إتلاف</button><small>{selected.length&&purgeBlockers.length?`طلب الإتلاف غير متاح: ${purgeBlockers.join("، ")}.`:"لا يوجد حذف دائم مباشر في هذه الشاشة."}</small></div>
    {showMetadata&&<form className="media-vault-bulk-form" onSubmit={saveMetadata}><b>تعديل بيانات {selected.length} أصل</b><label>الوصف البديل العربي<input name="altAr" minLength={2} maxLength={2000} placeholder="مثال: شعار مقهى البستان على خلفية فاتحة" /><small>يصف محتوى الصورة لقارئ الشاشة وعند تعذر عرضها.</small></label><label>التعليق العربي<input name="captionAr" maxLength={2000} placeholder="تعليق يظهر مع الصورة عند استخدامه" /></label><label>ملاحظة داخلية للمشغّل<input name="operatorNote" maxLength={1000} placeholder="لا تظهر للمستخدمين" /></label><button disabled={working}>حفظ البيانات</button><button type="button" onClick={()=>setShowMetadata(false)}>إلغاء</button></form>}
    {message&&<p className="admin-message" role="status">{message}</p>}
    <div className="media-vault-layout">
      <div className={`media-vault-assets ${layout}`}>
        {visible.map((asset)=>{const links=activeLinks(asset);const rights=latestRights(asset);const pendingPurge=asset.purge_requests.some((request)=>["pending","approved","executing"].includes(request.status));return <article key={asset.id} className={`${inspectedId===asset.id?"active":""} ${selected.includes(asset.id)?"selected":""}`} onClick={()=>setInspectedId(asset.id)}>
          <label className="media-vault-check" onClick={(event)=>event.stopPropagation()}><input type="checkbox" checked={selected.includes(asset.id)} onChange={(event)=>setSelected((current)=>event.target.checked?[...new Set([...current,asset.id])]:current.filter((id)=>id!==asset.id))} /><span className="sr-only">تحديد الأصل</span></label>
          <div className="media-vault-thumb">{asset.preview_url&&asset.detected_mime!=="application/pdf"?<img src={asset.preview_url} alt={links[0]?.alt_ar||asset.original_filename} />:<span>{asset.detected_mime==="application/pdf"?"PDF":"لا توجد معاينة"}</span>}</div>
          <div className="media-vault-card-copy"><b title={asset.original_filename}>{asset.original_filename}</b><span>{purposeLabels[asset.purpose]||asset.purpose}</span><small>{asset.detected_mime||asset.declared_mime} · {bytes(asset.byte_size)} · {asset.width&&asset.height?`${asset.width}×${asset.height}`:"الأبعاد غير متاحة"}</small><div className="media-vault-badges"><i data-state={asset.lifecycle_state}>{statusLabels[asset.lifecycle_state]||asset.lifecycle_state}</i><i data-state={asset.technical_status}>{statusLabels[asset.technical_status]||asset.technical_status}</i>{asset.legal_hold&&<i data-state="hold">LEGAL HOLD</i>}{links.length===0&&<i data-state="orphan">بلا رابط</i>}{!rights&&<i data-state="rights">حقوق ناقصة</i>}{pendingPurge&&<i data-state="purge">{statusLabels[asset.lifecycle_state]||"طلب إتلاف"}</i>}</div></div>
        </article>})}
        {!visible.length&&<div className="media-vault-empty"><h3>لا توجد أصول في هذه القائمة</h3><p>الخزنة تعمل مستقلة عن عدد المنتجات أو التصنيفات، لذلك هذه حالة صحيحة وليست خطأ تحميل.</p></div>}
      </div>
      <aside className="media-vault-inspector">
        {!inspected?<div className="media-vault-empty"><h3>اختر أصلاً</h3><p>ستظهر هنا البيانات التقنية والحقوق والروابط وسجل العمليات.</p></div>:<>
          <div className="media-vault-preview">{inspected.preview_url&&inspected.detected_mime!=="application/pdf"?<img src={inspected.preview_url} alt={activeLinks(inspected)[0]?.alt_ar||inspected.original_filename} />:<span>المعاينة غير متاحة</span>}</div>
          <h3>{inspected.original_filename}</h3><dl className="media-vault-metadata"><div><dt>حالة دورة الحياة</dt><dd className="rtl-value">{statusLabels[inspected.lifecycle_state]||inspected.lifecycle_state}</dd></div><div><dt>الوصف البديل المحفوظ</dt><dd className="rtl-value">{inspectedLink?.alt_ar||"—"}</dd></div><div><dt>التعليق المحفوظ</dt><dd className="rtl-value">{inspectedLink?.caption_ar||"—"}</dd></div><div><dt>ملاحظة المشغّل</dt><dd className="rtl-value">{String(inspected.technical_report?.operator_note||"—")}</dd></div><div><dt>الحالة التقنية</dt><dd className="rtl-value">{statusLabels[inspected.technical_status]||inspected.technical_status}</dd></div><div><dt>انتهاء الاحتفاظ</dt><dd>{inspected.retention_expires_at?`${new Date(inspected.retention_expires_at).toLocaleString("ar-IQ")} — المتبقي ${retentionDaysRemaining(inspected)} يوم`:"—"}</dd></div><div><dt>MIME المعلن</dt><dd>{inspected.declared_mime}</dd></div><div><dt>MIME المكتشف</dt><dd>{inspected.detected_mime||"—"}</dd></div><div><dt>الحجم</dt><dd>{bytes(inspected.byte_size)}</dd></div><div><dt>الأبعاد</dt><dd>{inspected.width&&inspected.height?`${inspected.width} × ${inspected.height}`:"—"}</dd></div><div><dt>البكسلات</dt><dd>{inspected.pixel_count?.toLocaleString("en-US")||"—"}</dd></div><div><dt>SHA-256</dt><dd title={inspected.sha256_hex||""}>{shortHash(inspected.sha256_hex)}</dd></div><div><dt>المسار الخاص</dt><dd title={inspected.original_storage_path}>{inspected.original_storage_path}</dd></div><div><dt>تاريخ الإدخال</dt><dd>{new Date(inspected.created_at).toLocaleString("ar-IQ")}</dd></div></dl>
          <details open><summary>الكيانات المرتبطة ({activeLinks(inspected).length})</summary><div className="media-vault-panel-list">{inspected.links.map((link)=><article key={link.id}><div><b>{link.target_label||link.entity_id}</b><span>{link.entity_type} · {link.role} · {link.link_status}</span><small>{link.alt_ar}</small></div>{link.link_status!=="removed"&&<button type="button" onClick={()=>onOpen({entity:link.entity_type,id:link.entity_id})}>فتح السجل</button>}</article>)}{!inspected.links.length&&<p>الأصل غير مرتبط بأي كيان.</p>}</div></details>
          <details open><summary>تدقيق الحقوق والمصدر ({inspected.rights.length})</summary><div className="media-vault-panel-list">{inspected.rights.map((right)=><article key={right.id}><div><b>{right.copyright_owner}</b><span>{right.rights_basis} · {right.review_status}</span><small>إقرار {right.attestation_version} · تجاري {right.commercial_use_allowed?"نعم":"لا"} · التعديل {right.modification_allowed?"نعم":"لا"}</small>{right.source_url&&<a href={right.source_url} target="_blank" rel="noreferrer">المصدر الموثق</a>}</div></article>)}{!inspected.rights.length&&<p className="media-vault-warning">لا توجد علاقة حقوق منظمة لهذا الأصل؛ ظهر تلقائياً في قائمة نواقص الحقوق.</p>}</div></details>
          <details><summary>سجل التدقيق ({inspected.events.length})</summary><div className="media-vault-timeline">{inspected.events.map((event)=><p key={event.id}><b>{event.event_type}</b><span>{event.previous_state||"—"} ← {event.next_state}</span><small>{new Date(event.created_at).toLocaleString("ar-IQ")} · {event.policy_version}</small></p>)}{!inspected.events.length&&<p>لا توجد أحداث بعد.</p>}</div></details>
          <details open><summary>طلبات الإتلاف ({inspected.purge_requests.length})</summary><div className="media-vault-panel-list">{inspected.purge_requests.map((request)=><article key={request.id}><div><b>{purgeStatusLabels[request.status]||request.status}</b><span>{request.reason}</span><small>{new Date(request.requested_at).toLocaleString("ar-IQ")}{request.review_note?` · ${request.review_note}`:""}</small></div>{canAdmin&&request.status==="pending"&&<><button type="button" disabled={working} onClick={()=>void reviewPurge(inspected,"approve_purge")}>اعتماد الإتلاف</button><button type="button" disabled={working} onClick={()=>void reviewPurge(inspected,"reject_purge")}>رفض الطلب</button></>}{canAdmin&&request.status==="approved"&&<button type="button" className="danger-action" disabled={working} onClick={()=>void executePurge(request.id)}>تنفيذ الإتلاف النهائي</button>}</article>)}{!inspected.purge_requests.length&&<p>لا يوجد طلب لهذا الأصل. الطلب لا يُنشأ إلا بعد الحجر ومرور 30 يوماً وعدم وجود روابط نشطة أو حجز قانوني.</p>}</div></details>
        </>}
      </aside>
    </div>
  </section>;
}
