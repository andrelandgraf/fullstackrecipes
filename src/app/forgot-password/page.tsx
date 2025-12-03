import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ForgotPassword } from "@/components/auth/forgot-password";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/chats");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <ForgotPassword />
    </main>
  );
}
