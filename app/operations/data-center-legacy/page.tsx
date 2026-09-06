import { LegacyDataCenterRollback } from "@/app/ui/admin/data-center-v2/LegacyDataCenterRollback";

export default function LegacyDataCenterRollbackPage() {
  return (
    <div data-data-center-cutover="legacy-rollback-only" data-default-data-center="/operations/data-center-v2">
      <LegacyDataCenterRollback />
    </div>
  );
}
