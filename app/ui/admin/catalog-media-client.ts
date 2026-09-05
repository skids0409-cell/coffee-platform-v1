"use client";

export type MediaRightsInput = {
  rightsBasis: string;
  copyrightOwner: string;
  sourceUrl: string;
  licenseUrl: string;
  permissionEvidence: string;
  attested: boolean;
};

export const allowedMediaExtension = (name: string) => ["jpg", "jpeg", "png", "webp", "avif"].includes(name.toLowerCase().split(".").pop() || "");

export const mediaErrorMessage = (reason?: string, receivedBytes?: number) => {
  if (reason === "file_too_large" || reason === "request_too_large") return `حجم الملف ${((receivedBytes || 0) / 1024 / 1024).toFixed(1)}MB يتجاوز حد الغرض المعتمد.`;
  if (reason === "unsupported_type") return "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو AVIF.";
  if (reason === "mime_mismatch") return "نوع الملف الفعلي لا يطابق النوع المعلن؛ رُفض الملف داخل الحجر الخاص.";
  if (["dimensions_below_minimum", "dimensions_above_maximum", "pixel_limit_exceeded", "aspect_ratio_out_of_bounds"].includes(reason || "")) return "أبعاد الصورة لا تطابق سياسة الغرض المحدد.";
  if (reason === "attestation_required") return "يجب قبول إقرار الحقوق والنشر وإنشاء النسخة المنقحة.";
  if (reason === "license_url_required" || reason === "permission_evidence_required") return "أساس الحقوق المختار يحتاج رابط رخصة أو دليل إذن مكتوب.";
  if (reason === "alt_required") return "اكتب وصفاً بديلاً للصورة من حرفين على الأقل.";
  if (reason === "rights_required") return "اكتب مصدر الصورة وحقوق استخدامها من ثلاثة أحرف على الأقل.";
  if (reason === "file_required") return "اختر ملف الصورة أولاً.";
  if (reason === "invalid_target") return "تعذر تحديد السجل الذي ستُربط به الصورة. أغلق النافذة وافتح السجل مجدداً.";
  if (reason === "storage_rejected") return "رفضت مكتبة الصور الملف قبل تخزينه. حدّث الصفحة وسجّل دخول الإدارة مجدداً، ثم جرّب JPG أو WebP أصغر.";
  if (reason === "upload_timeout") return "تجاوز الرفع ثلاث دقائق وأوقفناه بأمان. تحقق من الاتصال ثم أعد المحاولة.";
  return "تعذر رفع الصورة إلى مكتبة الوسائط. لم تُسجل الصورة؛ أعد المحاولة بعد تحديث الصفحة.";
};

export async function uploadCatalogMedia(entity: string, entityId: string, file: File, altAr: string, rights: MediaRightsInput) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 180_000);
  try {
    const intentResponse = await fetch("/api/admin/media", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        entity,
        entityId,
        filename: file.name,
        declaredMime: file.type,
        altAr,
        rightsBasis: rights.rightsBasis,
        copyrightOwner: rights.copyrightOwner,
        sourceUrl: rights.sourceUrl,
        licenseUrl: rights.licenseUrl,
        permissionEvidence: rights.permissionEvidence,
        attested: rights.attested,
        commercialUseAllowed: rights.attested,
        modificationAllowed: rights.attested,
      }),
      signal: controller.signal,
    });
    if (!intentResponse.ok) return intentResponse;

    const intent = await intentResponse.json() as { intentId: string; signedUploadUrl: string; maxBytes: number };
    if (file.size > intent.maxBytes) return Response.json({ reason: "file_too_large", maxBytes: intent.maxBytes, receivedBytes: file.size }, { status: 400 });

    const uploadBody = new FormData();
    uploadBody.append("cacheControl", "0");
    uploadBody.append("", file);
    const uploadResponse = await fetch(intent.signedUploadUrl, { method: "PUT", headers: { "x-upsert": "false" }, body: uploadBody, signal: controller.signal });
    if (!uploadResponse.ok) return Response.json({ reason: "storage_rejected", storageStatus: uploadResponse.status }, { status: 502 });

    return await fetch("/api/admin/media/validate", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intentId: intent.intentId }),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}
