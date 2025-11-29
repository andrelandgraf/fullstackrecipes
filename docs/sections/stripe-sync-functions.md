## Stripe Sync Functions

Implement upsert logic to handle both new records and updates from webhook events.

```typescript
// lib/stripe-sync.ts
import { db } from "@/lib/db";
import type Stripe from "stripe";

export async function syncProduct(product: Stripe.Product) {
  await db
    .insert(stripeProducts)
    .values({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      metadata: product.metadata,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: stripeProducts.id,
      set: {
        name: product.name,
        description: product.description,
        active: product.active,
        metadata: product.metadata,
        updatedAt: new Date(),
      },
    });
}

export async function syncPrice(price: Stripe.Price) {
  await db
    .insert(stripePrices)
    .values({
      id: price.id,
      productId: price.product as string,
      currency: price.currency,
      unitAmount: price.unit_amount,
      recurringInterval: price.recurring?.interval,
      active: price.active,
      metadata: price.metadata,
    })
    .onConflictDoUpdate({
      target: stripePrices.id,
      set: {
        active: price.active,
        metadata: price.metadata,
      },
    });
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  await db
    .insert(stripeSubscriptions)
    .values({
      id: subscription.id,
      customerId: subscription.customer as string,
      priceId: subscription.items.data[0].price.id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: stripeSubscriptions.id,
      set: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      },
    });
}
```

Using `onConflictDoUpdate` ensures idempotent operations - the same event can be processed multiple times safely.
