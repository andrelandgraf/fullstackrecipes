import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { ForgotPassword } from "@/components/auth/forgot-password";

export const metadata: Metadata = {
  title: "Forgot Password",
  description:
    "Reset your password by entering your email address. We'll send you a link to create a new one.",
};

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
