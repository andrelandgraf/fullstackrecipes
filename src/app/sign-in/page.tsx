import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { SignIn } from "@/components/auth/sign-in";
import { vercelSignInFlag } from "@/lib/auth/flags";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your account to access your chats and saved conversations.",
};

export default async function SignInPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/chats");
  }

  const showVercelSignIn = await vercelSignInFlag();

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <SignIn showVercelSignIn={showVercelSignIn} />
    </main>
  );
}
