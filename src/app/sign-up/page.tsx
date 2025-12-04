import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignUp } from "@/components/auth/sign-up";
import { vercelSignInFlag } from "@/lib/auth/flags";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free account to start building with AI-powered chat and explore full-stack recipes.",
};

export default async function SignUpPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/chats");
  }

  const showVercelSignIn = await vercelSignInFlag();

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignUp showVercelSignIn={showVercelSignIn} />
    </main>
  );
}
