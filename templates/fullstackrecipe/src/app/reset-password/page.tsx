import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ResetPassword } from "@/components/auth/reset-password";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Create a new password for your account.",
};

type SearchParams = Promise<{ token?: string; error?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  const { token, error } = await searchParams;

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <ResetPassword token={token ?? null} error={error ?? null} />
    </main>
  );
}
