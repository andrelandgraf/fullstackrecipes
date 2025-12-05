## Stripe Subscription Overview

The subscription system uses:

- **Stripe** for payment processing and subscription management
- **Vercel Flags** for plan configuration and feature gating
- **Postgres (via Drizzle ORM)** for storing customer and subscription data
- **Webhooks** for syncing subscription state changes

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

Add these to your `.env` files:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...          # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
STRIPE_PRO_PRICE_ID=price_...          # Price ID for PRO plan

# Application URL (for redirects)
NEXT_PUBLIC_ORIGIN=http://localhost:3000
```
