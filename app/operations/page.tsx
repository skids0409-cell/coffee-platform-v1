import { OperationsController } from "@/app/ui/admin/OperationsController";

export default function OperationsPage() {
  return (
    <main
      data-operations-route="governed-v2"
      data-publication-gate="حاجز النشر مفعّل"
      data-review-queue="طابور المراجعة والاعتماد"
    >
      <OperationsController />
    </main>
  );
}
