## Webhook Handling

### API Route

```typescript
// app/api/stripe/route.ts
import { after, NextResponse } from "next/server";

// GET: Post-checkout redirect handler
export async function GET() {
  return withAuthenticatedUserContext(async () => {
    const { userId } = getUserServerContext();
    const customer = await getStripeCustomer(userId);

    if (customer) {
      await syncStripeData(customer.stripeCustomerId);
    }

    redirect("/app/settings");
  });
}

// POST: Webhook handler
export async function POST(req: Request) {
  return withUnauthenticatedContext(async () => {
    const body = await req.text();
    const signature = await headers().then((h) => h.get("Stripe-Signature"));

    if (!signature) {
      return new NextResponse("No signature", { status: 400 });
    }

    // Process webhook in background (after response)
    after(async () => {
      await processStripeEvent({ body, signature });
    });

    return new NextResponse(null, { status: 200 });
  });
}
```

### Webhook Event Processing

```typescript
// lib/stripe/stripe.ts
const allowedEventTypes = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
] as const;

export async function processStripeEvent({
  body,
  signature,
}: {
  body: string;
  signature: string;
}) {
  const { event, success, error } = getStripeWebhookEvent({ body, signature });

  if (!success) {
    throw new Error(`Stripe webhook event error: ${error.message}`);
  }

  if (!isAllowedEventType(event)) {
    console.warn(`[STRIPE HOOK] Received untracked event: ${event.type}`);
    return;
  }

  const { customer } = event.data.object;
  if (typeof customer !== "string") {
    throw new Error("Stripe webhook handler failed");
  }

  await syncStripeData(customer);
}

function getStripeWebhookEvent({
  body,
  signature,
}: {
  body: string;
  signature: string;
}) {
  const { stripe, config } = getServerContext();
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret,
    );
    return { success: true as const, event, error: null };
  } catch (error) {
    return { success: false as const, error: error as Error, event: null };
  }
}
```

### Syncing Subscription Data

```typescript
export async function syncStripeData(customerId: string) {
  const { stripe } = getServerContext();
  const stripeCustomer = await getStripeCustomerByCustomerId(customerId);

  if (!stripeCustomer) {
    throw new Error(`Stripe customer not found: ${customerId}`);
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptions.data.length === 0) {
    await deleteSubscriptions(customerId);
    return null;
  }

  const subscriptionData = subscriptions.data[0];

  await upsertSubscription(stripeCustomer.userId, {
    userId: stripeCustomer.userId,
    stripeSubscriptionId: subscriptionData.id,
    status: subscriptionData.status,
    stripePriceId: subscriptionData.items.data[0].price.id,
    currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
    currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
  });
}
```
