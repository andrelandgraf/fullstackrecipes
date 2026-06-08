import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getUserPlan } from "@/lib/stripe/plans";
import { getSubscription } from "@/lib/stripe/queries";
import { getOrCreateUserMetrics } from "@/lib/stripe/queries";
import { SubscriptionCard } from "@/components/settings/subscription-card";
import { UsageCard } from "@/components/settings/usage-card";
import { ThemeSelector } from "@/components/themes/selector";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const [plan, subscription, metrics] = await Promise.all([
    getUserPlan(session.user.id),
    getSubscription(session.user.id),
    getOrCreateUserMetrics(session.user.id),
  ]);

  const isPro = plan.id === "PRO";

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            My App
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <SubscriptionCard
            plan={plan}
            subscription={subscription}
            isPro={isPro}
            emailVerified={session.user.emailVerified}
          />

          <UsageCard
            chatRequests={metrics.chatRequests}
            chatLimit={plan.chatLimit}
            planName={plan.id}
          />
        </div>

        <div className="mt-8">
          <Link
            href="/profile"
            className="text-sm text-muted-foreground hover:underline"
          >
            Manage account settings
          </Link>
        </div>
      </main>
    </div>
  );
}
