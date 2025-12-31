import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ChangePassword } from "@/components/profile/change-password";
import { ChangeEmail } from "@/components/profile/change-email";
import { DeleteAccount } from "@/components/profile/delete-account";
import { Sessions } from "@/components/profile/sessions";
import { ResendVerification } from "@/components/profile/resend-verification";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your profile, security settings, email preferences, and active sessions.",
};

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 max-w-2xl">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="font-semibold">Account Settings</h1>
        </div>
      </header>
      <main className="container max-w-2xl py-8 px-4">
        <div className="space-y-6">
          <ResendVerification />
          <ProfileHeader />
          <ChangeEmail />
          <ChangePassword />
          <Sessions />
          <DeleteAccount />
        </div>
      </main>
    </div>
  );
}
