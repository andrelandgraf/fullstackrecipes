### Architecture Flow

```
User Action → Checkout Session → Stripe → Webhook → Database Sync → Feature Access
```

---

## Dependencies

Required packages in `package.json`:

```json
{
  "dependencies": {
    "stripe": "^17.7.0",
    "flags": "^4.0.0",
    "@vercel/edge-config": "^1.4.0",
    "drizzle-orm": "^0.40.0",
    "zod": "^3.23.8"
  }
}
```

---

## Environment Variables

Add these to your `.env.development` (synced to Vercel):

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
STRIPE_PRO_PRICE_ID=price_...          # Price ID for PRO plan

# Application URL (for redirects)
NEXT_PUBLIC_ORIGIN=http://localhost:3000
```

---

## Stripe Database Schema

### Stripe Customers Table

Links authenticated users to Stripe customer IDs:

```typescript
// src/lib/db/schema.ts
export const stripeCustomersTable = pgTable(
  "stripe_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    sql`FOREIGN KEY ("user_id") REFERENCES "neon_auth"."usersSyncTable"("id")`,
  ],
);
```

### Subscriptions Table

Stores active subscription data:

```typescript
export const SUBSCRIPTION_STATUS = [
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "paused",
  "trialing",
  "unpaid",
] as const;

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripePriceId: text("stripe_price_id").notNull(),
    status: text("status", { enum: SUBSCRIPTION_STATUS }).notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      withTimezone: true,
    }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt,
    updatedAt,
  },
  () => [
    sql`FOREIGN KEY ("user_id") REFERENCES "neon_auth"."usersSyncTable"("id")`,
  ],
);
```

### User Metrics Table

Tracks usage per user per month:

```typescript
export const userMetricsTable = pgTable(
  "user_metrics",
  {
    userId: text("user_id").notNull(),
    month: text("month").notNull(), // Format: "YYYY-MM"
    chatRequests: integer("chat_requests").default(0).notNull(),
    createdAt,
    updatedAt,
  },
  () => [
    sql`PRIMARY KEY("user_id", "month")`,
    sql`FOREIGN KEY ("user_id") REFERENCES "neon_auth"."usersSyncTable"("id")`,
  ],
);
```

---

## Stripe Client Setup

Create a typed Stripe client factory:

```typescript
// src/lib/stripe/client.ts
import { Stripe } from "stripe";
import { type ServerApplicationConfig } from "@/lib/config";

export type StripeClient = ReturnType<typeof createStripeClient>;

export type StripeClientContext = {
  config: ServerApplicationConfig;
};

export function createStripeClient({ config }: StripeClientContext) {
  return new Stripe(config.stripe.secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}
```

### Configuration Schema

```typescript
// src/lib/config.ts
const ConfigSchema = z.object({
  stripe: z.object({
    secretKey: z.string().min(1, "STRIPE_SECRET_KEY is required"),
    webhookSecret: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
    proPriceId: z.string().min(1, "STRIPE_PRO_PRICE_ID is required"),
  }),
  // ... other config
});
```

---

## Subscription Plans & Feature Flags

Plans are defined using Vercel Flags for easy configuration and testing:

```typescript
// src/lib/stripe/plans.ts
import { flag } from "flags/next"

export function getPlansFlag() {
  const { config } = getServerContext()

  const defaultPlans = [
    {
      id: "FREE",
      priceId: undefined,
      chatLimit: 10,
      chatDaysBehind: 0,
      chatDaysAhead: 30,
    },
    {
      id: "PRO",
      priceId: config.stripe.proPriceId,
      chatLimit: 1000,
      chatDaysBehind: Infinity,
      chatDaysAhead: Infinity,
    },
  ]

  return flag({
    key: "subscription-plans",
    options: [
      { label: "Default", value: defaultPlans },
      { label: "Unlimited", value: [...] }, // Testing variant
    ],
    decide() {
      return defaultPlans
    },
  })
}
```

### Getting User's Current Plan

```typescript
export async function getStripePlan(userId: string) {
  const plansFlag = getPlansFlag();
  const plans = await plansFlag();
  const freePlan = plans.find((plan) => plan.priceId === undefined) ?? plans[0];

  const [customer, subData] = await Promise.all([
    getStripeCustomer(userId),
    getSubscription(userId),
  ]);

  if (!customer) return freePlan;
  if (!subData || subData.status !== "active") return freePlan;

  return (
    plans.find((plan) => plan.priceId === subData.stripePriceId) ?? freePlan
  );
}
```

### Vercel Flags API Endpoint

Expose flags for Vercel Toolbar testing:

```typescript
// src/app/.well-known/vercel/flags/route.ts
import { verifyAccess, type ApiData } from "flags";
import { getProviderData } from "flags/next";

export async function GET(request: NextRequest) {
  const access = await verifyAccess(request.headers.get("Authorization"));
  if (!access) return NextResponse.json(null, { status: 401 });

  return withUnauthenticatedContext(() => {
    const providerData = getProviderData({
      plans: getPlansFlag(),
    });
    return NextResponse.json<ApiData>(providerData);
  });
}
```

---

## Customer Management

### Database Operations

```typescript
// src/lib/db/stripe-customers.ts
export async function createStripeCustomer(
  authenticatedUserId: string,
  newStripeCustomer: NewStripeCustomer,
): Promise<StripeCustomer> {
  const { db } = getUserServerContext();
  const result = await db
    .insert(stripeCustomersTable)
    .values({ ...newStripeCustomer, userId: authenticatedUserId })
    .returning();
  return result[0];
}

export async function getStripeCustomer(
  authenticatedUserId: string,
): Promise<StripeCustomer | null> {
  const { db } = getUserServerContext();
  const result = await db
    .select()
    .from(stripeCustomersTable)
    .where(eq(stripeCustomersTable.userId, authenticatedUserId));
  return result[0] ?? null;
}

export async function getStripeCustomerByCustomerId(
  stripeCustomerId: string,
): Promise<StripeCustomer | null> {
  const { db } = getUserServerContext();
  const result = await db
    .select()
    .from(stripeCustomersTable)
    .where(eq(stripeCustomersTable.stripeCustomerId, stripeCustomerId));
  return result[0] ?? null;
}
```

### Creating Stripe Customer

```typescript
// src/lib/stripe/stripe.ts
export async function createStripeCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const { stripe } = getServerContext();
  const customer = await stripe.customers.create(
    {
      email,
      name: name ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: userId }, // Prevents duplicate customers
  );
  return customer.id;
}
```

---

## Checkout Flow

### Redirect to Checkout

```typescript
// src/lib/stripe/stripe.ts
export async function redirectToCheckout({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}) {
  const { stripe, config } = getServerContext();

  // Get or create Stripe customer
  const customer = await getStripeCustomerDb(userId);
  let stripeCustomerId = customer?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customerId = await createStripeCustomer({ userId, email, name });
    stripeCustomerId = customerId;
    await createStripeCustomerDb(userId, { stripeCustomerId, userId });
  }

  // Get PRO plan price
  const plansFlag = getPlansFlag();
  const plans = await plansFlag();

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: plans.find((plan) => plan.id === "PRO")?.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${config.origin}/api/stripe`,
    cancel_url: `${config.origin}/api/stripe`,
    metadata: { userId },
  });

  redirect(checkoutSession.url!);
}
```

### Server Action for Checkout

```typescript
// src/app/app/settings/actions.ts
"use server";

export async function createCheckoutSession() {
  return withAuthenticatedUserContext(async () => {
    const { user } = getAuthenticatedUserContext();

    if (!user.primaryEmailVerified || !user.primaryEmail) {
      throw new Error("Email not verified");
    }

    await redirectToCheckout({
      userId: user.id,
      email: user.primaryEmail,
      name: user.displayName,
    });
  });
}
```

---

## Webhook Handling

### API Route

```typescript
// src/app/api/stripe/route.ts
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
// src/lib/stripe/stripe.ts
import { logger } from "@/lib/logging/logger";

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
    logger.warn({ eventType: event.type }, "Received untracked Stripe event");
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

---

## Billing Portal

Allow users to manage their subscription:

```typescript
// src/lib/stripe/stripe.ts
export async function redirectToBillingPortal({ userId }: { userId: string }) {
  const { stripe, config } = getServerContext();
  const customer = await getStripeCustomer(userId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${config.origin}/app/settings`,
  });

  redirect(portalSession.url!);
}
```

### Server Action

```typescript
// src/app/app/settings/actions.ts
export async function createBillingPortalSession() {
  return withAuthenticatedUserContext(async () => {
    const { user } = getAuthenticatedUserContext();
    await redirectToBillingPortal({ userId: user.id });
  });
}
```

---

## Usage Tracking

### User Metrics Service

```typescript
// src/lib/user-metrics/service.ts
import "server-only";

export class UserMetricsService {
  static getOrCreateCurrentMonthMetrics = async (
    userId: string,
  ): Promise<MonthlyUserMetrics> => {
    const currentMonth = getCurrentMonth(); // "YYYY-MM" format
    let [monthlyMetrics, stripePlan] = await Promise.all([
      getUserMetrics(userId, currentMonth),
      getStripePlan(userId),
    ]);

    if (monthlyMetrics) {
      return {
        chatRequests: monthlyMetrics.chatRequests,
        chatLimit: monthlyMetrics.chatLimit,
        subscription: monthlyMetrics.subscription,
      };
    }

    const newMetrics = await createUserMetrics(userId, getCurrentMonth(), 0);
    return {
      chatRequests: newMetrics.chatRequests,
      chatLimit: stripePlan.chatLimit,
      subscription: stripePlan.id,
    };
  };

  static incrementChatRequests = async (
    userId: string,
  ): Promise<MonthlyUserMetrics> => {
    const monthlyMetrics = await this.getOrCreateCurrentMonthMetrics(userId);
    const incrementedMetrics = await incrementUserMetrics(
      userId,
      getCurrentMonth(),
    );

    return {
      chatRequests: incrementedMetrics.chatRequests,
      chatLimit: monthlyMetrics.chatLimit,
      subscription: monthlyMetrics.subscription,
    };
  };
}
```

### Database Operations

```typescript
// src/lib/db/user-metrics.ts
export async function incrementUserMetrics(
  userId: string,
  month: string,
): Promise<UserMetrics | null> {
  const { db } = getUserServerContext();
  const [updatedMetrics] = await db
    .update(userMetricsTable)
    .set({
      chatRequests: sql`${userMetricsTable.chatRequests} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userMetricsTable.userId, userId),
        eq(userMetricsTable.month, month),
      ),
    )
    .returning();

  return updatedMetrics;
}
```

---

## UI Integration

### Subscription Context Provider

```typescript
// src/lib/stripe/subscription-info.tsx
"use client"

import { createContext, useContext } from "react"

export type SubscriptionInfo = {
  planName: string
  chatLimit: number
}

const SubscriptionContext = createContext<SubscriptionInfo>({
  planName: "FREE",
  chatLimit: 100,
})

export function SubscriptionContextProvider({
  children,
  subscriptionInfo,
}: {
  children: React.ReactNode
  subscriptionInfo: SubscriptionInfo
}) {
  return (
    <SubscriptionContext.Provider value={subscriptionInfo}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscriptionInfo() {
  return useContext(SubscriptionContext)
}
```

### Settings Page Component

```tsx
// Usage in settings page
<div className="flex justify-end">
  {isPro ? (
    <form action={createBillingPortalSession}>
      <Button type="submit">Manage Subscription</Button>
    </form>
  ) : (
    <form action={createCheckoutSession}>
      <Button type="submit">Upgrade to Pro</Button>
    </form>
  )}
</div>

// Usage progress display
<div className="space-y-2">
  <div className="flex items-center justify-between text-sm">
    <span>Monthly Chat Requests</span>
    <span className="font-medium">
      {chatRequestCount} / {chatLimit}
    </span>
  </div>
  <Progress value={(chatRequestCount / chatLimit) * 100} className="h-2" />
</div>
```

---

## Development Setup

### Local Webhook Forwarding

The `stripe.dev.ts` script uses Stripe CLI to forward webhooks locally:

```typescript
// scripts/stripe.dev.ts
import { spawn } from "child_process";

const events = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  // ... all webhook events
];

const url = `${process.env.NEXT_PUBLIC_ORIGIN}/api/stripe`;
const stripeProcess = spawn("stripe", [
  "listen",
  "--events",
  events.join(","),
  "--forward-to",
  url,
]);
```

### Running Development Server

```bash
# In apps/web directory
bun dev

# This runs (via npm-run-all):
# - bun dev:next    → Next.js dev server
# - bun dev:stripe  → Stripe webhook forwarder
```

### Stripe CLI Setup

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login to Stripe: `stripe login`
3. Set `.env.development` with test keys

---

## Production Setup

### Production Webhook Registration

The `stripe.setup.ts` script registers webhook endpoint in Stripe Dashboard:

```typescript
// scripts/stripe.setup.ts
import Stripe from "stripe";
import { logger } from "@/lib/logging/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const url = `${process.env.NEXT_PUBLIC_ORIGIN}/api/stripe`;

const webhook = await stripe.webhookEndpoints.create({
  url,
  enabled_events: events,
  description: "Webhook endpoint for production",
});

logger.info({ secret: webhook.secret }, "Webhook signing secret");
// Add this to your .env.development as STRIPE_WEBHOOK_SECRET and sync with `bun run env:push`
```

### Production Checklist

1. **Create Stripe Products/Prices** in Stripe Dashboard
2. **Set Environment Variables**:
   - `STRIPE_SECRET_KEY` - Live secret key
   - `STRIPE_WEBHOOK_SECRET` - From webhook registration
   - `STRIPE_PRO_PRICE_ID` - Your PRO plan price ID
3. **Run Webhook Setup**: `bun run start:stripe`
4. **Configure Billing Portal** in Stripe Dashboard
5. **Test the Complete Flow**:
   - User clicks "Upgrade to Pro"
   - Completes checkout
   - Webhook fires
   - Subscription synced to database
   - User sees PRO features

---

## Summary

The subscription implementation follows these key patterns:

1. **Separation of Concerns**: Stripe operations, database operations, and UI are cleanly separated
2. **Idempotent Operations**: Customer creation uses idempotency keys to prevent duplicates
3. **Background Processing**: Webhooks return 200 immediately and process in background
4. **Feature Flags**: Plans are configurable via Vercel Flags for testing
5. **Type Safety**: Full TypeScript with Zod validation for Stripe statuses
6. **Usage Tracking**: Monthly metrics tracked per user with plan-based limits
