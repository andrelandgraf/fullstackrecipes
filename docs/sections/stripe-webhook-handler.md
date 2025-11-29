## Stripe Webhook Handler

Handle Stripe webhook events to keep your local database in sync with Stripe's data.

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response("Webhook signature verification failed", {
      status: 400,
    });
  }

  switch (event.type) {
    case "product.created":
    case "product.updated":
      await syncProduct(event.data.object as Stripe.Product);
      break;
    case "price.created":
    case "price.updated":
      await syncPrice(event.data.object as Stripe.Price);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
  }

  return new Response("OK", { status: 200 });
}
```

Always verify webhook signatures to ensure events are genuinely from Stripe.
