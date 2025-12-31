# Stripe Sync Template

A Next.js starter with complete subscription system: Stripe checkout, webhook sync, billing portal, usage tracking, and subscription management.

Built with the [Stripe Subscriptions DB Sync](https://fullstackrecipes.com/recipes/stripe-sync) recipe from fullstackrecipes.

## Quick Start

1. **Clone and install:**

   ```bash
   npx tiged fullstackrecipes/s2-ai-chat/templates/stripe-sync my-app
   cd my-app
   bun install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.development
   ```

   Edit `.env.development` with your:
   - Neon database URL (from [Neon Console](https://console.neon.tech))
   - Better Auth secret (generate with `openssl rand -base64 32`)
   - Resend API key (from [resend.com/api-keys](https://resend.com/api-keys))
   - AI Gateway API key or Vercel OIDC token
   - Stripe secret key (from [Stripe Dashboard](https://dashboard.stripe.com/apikeys))
   - Stripe webhook secret (from Stripe CLI or dashboard)
   - Stripe PRO price ID (create a product in Stripe)
   - Origin URL (`http://localhost:3000` for local dev)

3. **Generate schema and run migrations:**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. **Set up Stripe CLI for local webhooks:**

   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login to Stripe
   stripe login
   ```

5. **Start the development server with Stripe:**

   In one terminal:

   ```bash
   bun run dev
   ```

   In another terminal:

   ```bash
   bun run dev:stripe
   ```

## What's Included

Everything from the [Auth Template](https://fullstackrecipes.com/recipes/authentication) plus:

- **Stripe Checkout** for subscription upgrades
- **Webhook handling** with signature verification
- **Subscription sync** to Postgres database
- **Billing portal** for subscription management
- **Usage tracking** with monthly limits
- **Settings page** with subscription and usage display

## Pages

| Route              | Description                     |
| ------------------ | ------------------------------- |
| `/`                | Home page                       |
| `/settings`        | Subscription and usage settings |
| `/sign-in`         | Sign in with email/password     |
| `/sign-up`         | Create new account              |
| `/forgot-password` | Request password reset          |
| `/reset-password`  | Set new password                |
| `/verify-email`    | Verify email address            |
| `/profile`         | Account settings (protected)    |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/     # Better Auth API
│   │   └── stripe/            # Stripe webhook & redirect handler
│   ├── settings/              # Subscription management
│   │   ├── page.tsx           # Settings page
│   │   └── actions.ts         # Server actions
│   ├── sign-in/, sign-up/     # Auth pages
│   └── profile/               # Account settings
├── components/
│   ├── settings/              # Subscription UI components
│   │   ├── subscription-card.tsx
│   │   └── usage-card.tsx
│   ├── auth/                  # Auth UI components
│   └── profile/               # Profile components
└── lib/
    ├── stripe/
    │   ├── config.ts          # Stripe config
    │   ├── client.ts          # Stripe client
    │   ├── schema.ts          # Database schema
    │   ├── queries.ts         # Database queries
    │   ├── plans.ts           # Subscription plans
    │   ├── checkout.ts        # Checkout flows
    │   └── webhook.ts         # Webhook processing
    ├── auth/                  # Auth library
    └── db/                    # Database config
```

## Subscription Flow

1. **User clicks "Upgrade to PRO"** on settings page
2. **Server creates Stripe customer** (if not exists)
3. **Redirect to Stripe Checkout**
4. **User completes payment**
5. **Stripe sends webhook** → processed in background
6. **Subscription synced** to database
7. **User redirected** to settings page with PRO status

## Webhook Events

The webhook handler processes these Stripe events:

- `checkout.session.completed` - Checkout completed
- `customer.subscription.*` - Subscription changes
- `invoice.*` - Invoice events
- `payment_intent.*` - Payment events

## Usage Tracking

Track monthly API usage per user:

```typescript
import {
  incrementUserMetrics,
  getOrCreateUserMetrics,
} from "@/lib/stripe/queries";

// Get current usage
const metrics = await getOrCreateUserMetrics(userId);

// Check limit before API call
if (metrics.chatRequests >= plan.chatLimit) {
  throw new Error("Monthly limit exceeded");
}

// Increment after successful call
await incrementUserMetrics(userId);
```

## Scripts

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `bun run dev`          | Start development server                  |
| `bun run dev:stripe`   | Start Stripe webhook forwarder            |
| `bun run build`        | Build for production                      |
| `bun run start:stripe` | Register production webhook endpoint      |
| `bun run db:generate`  | Generate auth schema + Drizzle migrations |
| `bun run db:migrate`   | Run database migrations                   |
| `bun run db:studio`    | Open Drizzle Studio                       |

## Production Setup

1. **Create Stripe products** in Stripe Dashboard
2. **Register production webhook:**

   ```bash
   bun run start:stripe
   ```

3. **Add webhook secret** to environment variables
4. **Configure billing portal** in Stripe Dashboard

## Learn More

- [fullstackrecipes.com](https://fullstackrecipes.com) - Recipes and cookbooks
- [Stripe Documentation](https://stripe.com/docs) - Stripe API docs
- [Better Auth](https://www.better-auth.com) - Authentication library
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
