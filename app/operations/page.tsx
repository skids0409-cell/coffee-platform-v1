import { OperationsController } from "@/app/ui/admin/OperationsController";
import { PendingAssetReviewBridge } from "@/app/ui/admin/PendingAssetReviewBridge";
import { GovernedOperationsBridge } from "@/app/ui/admin/governance/GovernedOperationsBridge";

export default function OperationsPage() {
  return (
    <main
      data-operations-route="governed-v2"
      data-publication-gate="حاجز النشر مفعّل"
      data-review-queue="طابور المراجعة والاعتماد"
    >
      <OperationsController />
      <GovernedOperationsBridge />
      <PendingAssetReviewBridge />
    </main>
  );
}
