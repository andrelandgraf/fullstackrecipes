"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createCheckoutSession,
  createBillingPortalSession,
} from "@/app/settings/actions";
import type { Subscription } from "@/lib/stripe/schema";

interface SubscriptionCardProps {
  plan: { id: string; chatLimit: number };
  subscription: Subscription | null;
  isPro: boolean;
  emailVerified: boolean;
}

export function SubscriptionCard({
  plan,
  subscription,
  isPro,
  emailVerified,
}: SubscriptionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription</CardTitle>
          <Badge variant={isPro ? "default" : "secondary"}>{plan.id}</Badge>
        </div>
        <CardDescription>
          {isPro
            ? "You have access to all PRO features."
            : "Upgrade to PRO for more features."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscription && (
          <div className="mb-4 text-sm text-muted-foreground">
            <p>
              Status: <span className="capitalize">{subscription.status}</span>
            </p>
            {subscription.cancelAtPeriodEnd && (
              <p className="text-yellow-600">
                Cancels at end of billing period
              </p>
            )}
            <p>
              Current period ends:{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          {isPro ? (
            <form action={createBillingPortalSession}>
              <Button type="submit" variant="outline">
                Manage Subscription
              </Button>
            </form>
          ) : (
            <form action={createCheckoutSession}>
              <Button type="submit" disabled={!emailVerified}>
                {emailVerified ? "Upgrade to PRO" : "Verify email to upgrade"}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
