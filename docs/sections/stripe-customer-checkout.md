## Customer Management

### Database Operations

```typescript
// lib/db/stripe-customers.ts
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
// lib/stripe/stripe.ts
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
// lib/stripe/stripe.ts
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
// app/app/settings/actions.ts
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
