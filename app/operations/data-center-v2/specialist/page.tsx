import { redirect } from "next/navigation";
import { OperationsController } from "@/app/ui/admin/OperationsController";

const allowed = new Set(["review", "media", "search", "requests", "archive", "taxonomy"]);

type SpecialistPageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>;
};

export default async function DataCenterV2SpecialistPage({ searchParams }: SpecialistPageProps) {
  const params = await searchParams;
  const raw = params.workspace;
  const workspace = Array.isArray(raw) ? raw[0] : raw;
  if (!workspace || !allowed.has(workspace)) redirect("/operations/data-center-v2?view=handoffs");

  return (
    <main data-data-center-version="v2" data-specialist-workspace={workspace}>
      <OperationsController />
    </main>
  );
}
