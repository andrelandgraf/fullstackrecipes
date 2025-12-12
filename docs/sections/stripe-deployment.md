## Development Setup

### Local Webhook Forwarding

The `stripe.dev.ts` script uses Stripe CLI to forward webhooks locally:

```typescript
// apps/web/scripts/stripe.dev.ts
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

### Prerequisites

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login to Stripe: `stripe login`
3. Set `.env.development` with test keys

---

## Production Setup

### Production Webhook Registration

The `stripe.setup.ts` script registers webhook endpoint in Stripe Dashboard:

```typescript
// apps/web/scripts/stripe.setup.ts
import Stripe from "stripe";
import { logger } from "@/lib/common/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const url = `${process.env.NEXT_PUBLIC_ORIGIN}/api/stripe`;

const webhook = await stripe.webhookEndpoints.create({
  url,
  enabled_events: events,
  description: "Webhook endpoint for production",
});

logger.info({ secret: webhook.secret }, "Webhook signing secret");
// Add this to your .env as STRIPE_WEBHOOK_SECRET
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
