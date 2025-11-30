## Stripe Client Setup

Create a typed Stripe client factory:

```typescript
// lib/stripe/client.ts
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
// lib/config.ts
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
// lib/stripe/plans.ts
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
// app/.well-known/vercel/flags/route.ts
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
