import { UpdatePassword } from "@/app/ui/PasswordRecovery";
import { recoveryCookieName, validateActiveAdminToken } from "@/lib/password-recovery";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const recoveryToken = cookieStore.get(recoveryCookieName)?.value || "";
  const admin = recoveryToken
    ? await validateActiveAdminToken(recoveryToken).catch(() => null)
    : null;

  return <UpdatePassword invalidLink={Boolean(params.error) || !admin} />;
}
