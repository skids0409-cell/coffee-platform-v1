"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import type { RecordCapabilityContract } from "@/lib/record-capability-types";
import { allowedMediaExtension, mediaErrorMessage, uploadCatalogMedia } from "@/app/ui/admin/catalog-media-client";

type IssueUpdate = { id: string; status: string; resolutionNote: string };

type ControllerProps = {
  entity: string;
  id: string;
  onSaved: () => Promise<void>;
  onClose: () => void;
};

export function useReviewRecordEditorController({ entity, id, onSaved, onClose }: ControllerProps) {
  const [data, setData] = useState<any>(null);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [editorContract, setEditorContract] = useState<RecordCapabilityContract | null>(null);
  const [issueUpdates, setIssueUpdates] = useState<IssueUpdate[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [mediaWorking, setMediaWorking] = useState("");
  const [editorCategoryId, setEditorCategoryId] = useState("");
  const [revisionKey, setRevisionKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/records?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.reason || "load_failed");
        if (!active) return;
        setData(result);
        const values = Object.fromEntries((result.record?.product_attribute_values || []).map((attribute: any) => {
          const jsonValue = attribute.value_json;
          const displayJson = Array.isArray(jsonValue) && ["multi_enum", "reference"].includes(attribute.field_definitions?.data_type) ? jsonValue.join(", ") : jsonValue ? JSON.stringify(jsonValue) : "";
          return [attribute.field_definition_id, String(attribute.value_text ?? attribute.value_integer ?? attribute.value_decimal ?? attribute.value_boolean ?? attribute.value_date ?? displayJson)];
        }));
        setAttributes(values);
        setEditorCategoryId(result.record?.product_categories?.find((item: any) => item.is_primary)?.category_id || result.record?.product_categories?.[0]?.category_id || "");
        setIssueUpdates((result.qualityIssues || []).map((issue: any) => ({ id: issue.id, status: "", resolutionNote: "" })));
      })
      .catch(() => active && setMessage("تعذر فتح السجل للتدقيق."));
    return () => { active = false; };
  }, [entity, id]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (data?.record?.status === "published" && !window.confirm("هذا السجل منشور حالياً، وأي تعديل سيظهر مباشرةً للمستخدمين بعد الحفظ. هل تريد المتابعة؟")) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (entity === "products" && !editorContract) { setMessage("تعذر تحميل عقد التصنيف المعتمد. أغلق السجل وافتحه مجدداً قبل الحفظ."); return; }
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/admin/records", {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entity,
        id,
        fields,
        attributes: Object.entries(attributes).map(([fieldId, value]) => ({ fieldId, value })),
        contractRevision: editorContract?.contract_revision,
        issueUpdates: issueUpdates.filter((issue) => issue.status),
      }),
    });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) {
      setMessage(result.reason === "contract_revision_stale" ? "تغير عقد التصنيف أثناء التعديل. أغلق السجل وافتحه مجدداً ثم راجع الفئة."
        : result.reason === "reclassification_required" ? "التصنيف التاريخي غير متوافق مع نوع المنتج؛ يلزم مسار إعادة تصنيف قبل الحفظ."
        : result.reason === "invalid_attribute_value" ? "إحدى قيم المواصفات غير معتمدة. اختر القيم من القوائم الظاهرة."
        : result.reason === "upstream_error" ? "تعذر حفظ السجل في قاعدة البيانات. لم تُحذف المواصفات السابقة؛ أعد المحاولة، وإذا تكرر الخطأ سجل الوقت الظاهر."
        : "تعذر الحفظ. تحقق من القيم المنظمة وروابط المصدر.");
      return;
    }
    setData((current: any) => ({ ...current, ...result }));
    await onSaved();
    onClose();
  };

  const addMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const originalFile = form.get("file");
    if (!(originalFile instanceof File) || !originalFile.size) { setMessage("اختر ملف صورة أولاً."); return; }
    if (!allowedMediaExtension(originalFile.name)) { setMessage(mediaErrorMessage("unsupported_type")); return; }
    const altAr = String(form.get("altAr") || "").trim();
    const copyrightOwner = String(form.get("copyrightOwner") || "").trim();
    const rightsBasis = String(form.get("rightsBasis") || "");
    if (altAr.length < 2) { setMessage(mediaErrorMessage("alt_required")); return; }
    if (copyrightOwner.length < 2 || !rightsBasis) { setMessage(mediaErrorMessage("rights_required")); return; }
    if (form.get("attested") !== "on") { setMessage(mediaErrorMessage("attestation_required")); return; }
    setMediaWorking("upload");
    setMessage("");
    try {
      const response = await uploadCatalogMedia(entity, id, originalFile, altAr, {
        rightsBasis,
        copyrightOwner,
        sourceUrl: String(form.get("sourceUrl") || ""),
        licenseUrl: String(form.get("licenseUrl") || ""),
        permissionEvidence: String(form.get("permissionEvidence") || ""),
        attested: true,
      });
      const result = await response.json().catch(() => ({}));
      setMediaWorking("");
      if (!response.ok) { setMessage(mediaErrorMessage(response.status === 413 ? "request_too_large" : (result.rejection_codes?.[0] || result.reason), originalFile.size)); return; }
      formElement.reset();
      setMessage(result.technical_status === "duplicate" ? "اكتشف الخادم ملفاً مطابقاً ببصمة SHA-256 ووضعه في مراجعة التعارض والحقوق؛ لم يُنشر ملف ثانٍ." : "اجتاز الملف الفحص التقني وبقي خاصاً في Media Vault. يحتاج اعتماد مراجع قبل إنشاء النسخة العامة وربطها بالسجل.");
    } catch (error) {
      setMediaWorking("");
      setMessage(mediaErrorMessage(error instanceof DOMException && error.name === "AbortError" ? "upload_timeout" : undefined));
    }
  };

  const deleteMedia = async (mediaId: string) => {
    if (!window.confirm("سيُفصل ارتباط الصورة بهذا السجل فقط. لن يُحذف ملف الأصل من Media Vault. هل تريد المتابعة؟")) return;
    setMediaWorking(mediaId);
    setMessage("");
    const response = await fetch("/api/admin/media", { method: "DELETE", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: mediaId }) });
    setMediaWorking("");
    if (!response.ok) { setMessage("تعذر فصل الصورة عن السجل."); return; }
    setData((current: any) => ({ ...current, media: (current.media || []).filter((item: any) => item.id !== mediaId) }));
    setMessage("فُصلت الصورة عن السجل وبقي الأصل محفوظاً في Media Vault وفق دورة حياته.");
  };

  const restoreRevision = async (eventId: string) => {
    if (!window.confirm("سيُعاد محتوى الحقول الأساسية إلى النسخة السابقة، مع الاحتفاظ بسجل كامل للعملية. العلاقات والصور لا تُحذف. هل تريد المتابعة؟")) return;
    setWorking(true);
    setMessage("جارٍ استعادة النسخة السابقة…");
    const response = await fetch("/api/admin/records", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restore_revision", entity, id, eventId }) });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) { setMessage(result.reason === "revision_has_no_snapshot" ? "هذه العملية القديمة لا تحتوي نسخة قابلة للاستعادة." : "تعذر استعادة النسخة. تحتاج صلاحية مراجع أو مدير."); return; }
    setData(result);
    setRevisionKey((value) => value + 1);
    setMessage("تمت استعادة الحقول الأساسية وتسجيل نسخة جديدة في السجل.");
    await onSaved();
  };

  return {
    data,
    setData,
    attributes,
    setAttributes,
    editorContract,
    setEditorContract,
    issueUpdates,
    setIssueUpdates,
    message,
    setMessage,
    working,
    mediaWorking,
    editorCategoryId,
    setEditorCategoryId,
    revisionKey,
    save,
    addMedia,
    deleteMedia,
    restoreRevision,
  };
}
