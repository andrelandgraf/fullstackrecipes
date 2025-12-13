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
