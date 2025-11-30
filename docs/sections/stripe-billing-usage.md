## Billing Portal

Allow users to manage their subscription:

```typescript
// lib/stripe/stripe.ts
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
// app/app/settings/actions.ts
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
// lib/user-metrics/service.ts
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
// lib/db/user-metrics.ts
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
