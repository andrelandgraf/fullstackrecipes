import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignUp } from "@/components/auth/sign-up";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a free account to get started.",
};

export default async function SignUpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignUp />
    </main>
  );
}
