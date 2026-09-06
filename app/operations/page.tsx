import { redirect } from "next/navigation";
import { OperationsController } from "@/app/ui/admin/OperationsController";

type OperationsPageProps = {
  searchParams: Promise<{ workspace?: string | string[] }>;
};

export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const params = await searchParams;
  const rawWorkspace = params.workspace;
  const workspace = Array.isArray(rawWorkspace) ? rawWorkspace[0] : rawWorkspace;

  if (!workspace || workspace === "entry" || workspace === "imports") {
    const view = workspace === "imports" ? "batches" : workspace === "entry" ? "catalog" : "overview";
    redirect(`/operations/data-center-v2?view=${view}`);
  }

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
