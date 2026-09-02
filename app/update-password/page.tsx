import { UpdatePassword } from "@/app/ui/PasswordRecovery";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return <UpdatePassword invalidLink={Boolean(params.error)} />;
}
