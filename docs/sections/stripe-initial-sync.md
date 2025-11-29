## Initial Stripe Sync

Run a backfill script to sync existing Stripe data before webhooks take over for future updates.

```typescript
// scripts/sync-stripe.ts
import Stripe from "stripe";
import { syncProduct, syncPrice } from "@/lib/stripe-sync";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function syncAll() {
  // Sync all products
  const products = await stripe.products.list({ limit: 100 });
  for (const product of products.data) {
    await syncProduct(product);
    console.log(`Synced product: ${product.name}`);
  }

  // Sync all prices
  const prices = await stripe.prices.list({ limit: 100 });
  for (const price of prices.data) {
    await syncPrice(price);
    console.log(`Synced price: ${price.id}`);
  }

  console.log("Stripe sync complete!");
}

syncAll();
```

Run this script once during setup or when connecting an existing Stripe account to your application.
