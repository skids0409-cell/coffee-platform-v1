import type { Metadata } from "next";
import { OperationsInbox } from "@/app/ui/admin/OperationsInbox";

export const metadata: Metadata = {
  title: "صندوق العمل التشغيلي | منصة القهوة",
  description: "قائمة تشغيل موحدة للمهام المفتوحة مع إبقاء القرارات داخل مصادرها الأصلية.",
};

export default function OperationsInboxPage() {
  return <main className="operations-inbox-page"><OperationsInbox /></main>;
}
