import { redirect } from "next/navigation";
import Platform from "../ui/Platform";

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const p = await params;
  const path = `/${p.slug.join("/")}`;
  if (path === "/operations") redirect("/operations");
  return <Platform path={path} />;
}
