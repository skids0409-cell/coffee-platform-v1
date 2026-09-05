import { OperationsController } from "@/app/ui/admin/OperationsController";
import { PendingAssetReviewBridge } from "@/app/ui/admin/PendingAssetReviewBridge";
import { GovernedOperationsBridge } from "@/app/ui/admin/governance/GovernedOperationsBridge";
import { OperationsWorkspaceChrome } from "@/app/ui/admin/governance/OperationsWorkspaceChrome";
import { OperationsCenterArchitecture } from "@/app/ui/admin/governance/OperationsCenterArchitecture";
import { OperationsWorkspaceComposition } from "@/app/ui/admin/governance/OperationsWorkspaceComposition";

export default function OperationsPage() {
  return (
    <main
      data-operations-route="governed-v2"
      data-publication-gate="حاجز النشر مفعّل"
      data-review-queue="طابور المراجعة والاعتماد"
    >
      <OperationsController />
      <OperationsWorkspaceChrome />
      <OperationsCenterArchitecture />
      <OperationsWorkspaceComposition />
      <GovernedOperationsBridge />
      <PendingAssetReviewBridge />
    </main>
  );
}
