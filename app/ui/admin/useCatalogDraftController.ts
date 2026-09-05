"use client";

import { useState } from "react";
import { mediaErrorMessage, uploadCatalogMedia, type MediaRightsInput } from "@/app/ui/admin/catalog-media-client";

export type PendingCatalogDraft = {
  entityType: string;
  payload: Record<string, string>;
  mediaFile: File | null;
  mediaAltAr: string;
  mediaRights: MediaRightsInput;
  attributes: Record<string, string>;
  contractRevision: string;
};

type ControllerProps = {
  onCreated: () => Promise<void>;
};

const statusLabel: Record<string, string> = { draft: "مسودة", in_review: "قيد المراجعة", published: "منشور", rejected: "مرفوض" };
const mediaEntityMap: Record<string, string> = { organization: "organizations", brand: "brands", product: "products", content: "contents", offer: "offers", origin: "origin_claims" };

export function useCatalogDraftController({ onCreated }: ControllerProps) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const createPendingDraft = async (pendingDraft: PendingCatalogDraft) => {
    const { entityType, payload, mediaFile, mediaAltAr, mediaRights, attributes, contractRevision } = pendingDraft;
    setWorking(true);
    setMessage("");
    let response: Response;
    let result: Record<string, any>;
    try {
      response = await fetch("/api/admin/data-center", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_catalog_draft",
          entityType,
          payload,
          attributes: Object.entries(attributes).map(([fieldId, value]) => ({ fieldId, value })),
          contractRevision,
          sourceConfirmed: true,
        }),
      });
      result = await response.json();
    } catch {
      setWorking(false);
      setMessage("تعذر الاتصال بقاعدة البيانات. لم تُنشأ المسودة؛ حدّث الصفحة وسجّل دخول الإدارة ثم حاول مجدداً.");
      return { ok: false as const };
    }
    setWorking(false);
    if (!response.ok) {
      setMessage(result.reason === "contract_revision_stale" ? "تغير عقد التصنيف أثناء الإدخال. أعد فتح النموذج وراجع الفئة قبل الحفظ."
        : result.reason === "category_kind_mismatch" ? "الفئة المختارة لا تنتمي إلى نوع المنتج. اختر فئة من القائمة المفلترة."
        : result.reason === "brand_kind_mismatch" ? "العلامة المختارة مسجلة لعائلة منتجات مختلفة."
        : result.reason === "duplicate_product" ? `يوجد منتج بهذا الاسم مسبقاً وحالته «${statusLabel[result.existing?.status] || result.existing?.status}». افتحه من السجلات بدلاً من إنشاء نسخة مكررة.`
        : result.reason === "duplicate_brand" ? `هذه العلامة موجودة مسبقاً وحالتها «${statusLabel[result.existing?.status] || result.existing?.status}». راجع السجل الموجود.`
        : result.reason === "duplicate_offer" ? `يوجد عرض سابق لهذا المنتج لدى البائع نفسه وحالته «${statusLabel[result.existing?.status] || result.existing?.status}». عدّله من السجلات بدلاً من تكراره.`
        : "تعذر إنشاء المسودة. تحقق من الحقول والمصدر والعلاقات المطلوبة.");
      return { ok: false as const };
    }

    const createdId = String(result.created?.id || result.id || "");
    if (mediaFile instanceof File && mediaFile.size > 0) {
      let mediaResponse: Response;
      try {
        mediaResponse = await uploadCatalogMedia(mediaEntityMap[entityType], createdId, mediaFile, mediaAltAr, mediaRights);
      } catch (error) {
        setMessage(`تم إنشاء المسودة، لكن الصورة لم تُحفظ: ${mediaErrorMessage(error instanceof DOMException && error.name === "AbortError" ? "upload_timeout" : undefined)} افتح السجل من الطابور ولا تنشئ سجلاً ثانياً.`);
        await onCreated();
        return { ok: true as const, createdId, mediaAttached: false };
      }
      if (!mediaResponse.ok) {
        const mediaResult = await mediaResponse.json().catch(() => ({}));
        setMessage(`تم إنشاء المسودة، لكن الصورة لم تُحفظ: ${mediaErrorMessage(mediaResult.reason, mediaResult.receivedBytes)} افتح السجل من الطابور ولا تنشئ منتجاً ثانياً.`);
        await onCreated();
        return { ok: true as const, createdId, mediaAttached: false };
      }
    }

    setMessage(entityType === "origin" ? "تم ربط مصدر القهوة بالمنتج، ووُضع ملفه إن وجد في مراجعة Media Vault."
      : entityType === "product" ? "تم إنشاء المنتج كمسودة. الصورة إن وُجدت بقيت خاصة ووُضعت في طابور Media Vault حتى اعتمادها؛ ولن يظهر المنتج في البحث حتى اعتماده."
      : "تم إنشاء المسودة. الملف إن وجد بقي خاصاً في طابور Media Vault حتى المراجعة والاعتماد.");
    await onCreated();
    return { ok: true as const, createdId, mediaAttached: Boolean(mediaFile?.size) };
  };

  return { working, message, setMessage, createPendingDraft };
}
