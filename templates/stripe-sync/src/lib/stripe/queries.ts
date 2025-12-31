import { db } from "@/lib/db/client";
import {
  stripeCustomers,
  subscriptions,
  userMetrics,
  type StripeCustomer,
  type NewStripeCustomer,
  type Subscription,
  type NewSubscription,
  type UserMetrics,
  type SubscriptionStatus,
} from "./schema";
import { eq, and, sql } from "drizzle-orm";

// =============================================================================
// Stripe Customers
// =============================================================================

export async function createStripeCustomer(
  data: NewStripeCustomer,
): Promise<StripeCustomer> {
  const [customer] = await db.insert(stripeCustomers).values(data).returning();
  return customer;
}

export async function getStripeCustomer(
  userId: string,
): Promise<StripeCustomer | null> {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.userId, userId),
  });
  return customer ?? null;
}

export async function getStripeCustomerByCustomerId(
  stripeCustomerId: string,
): Promise<StripeCustomer | null> {
  const customer = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.stripeCustomerId, stripeCustomerId),
  });
  return customer ?? null;
}

// =============================================================================
// Subscriptions
// =============================================================================

export async function getSubscription(
  userId: string,
): Promise<Subscription | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });
  return subscription ?? null;
}

export async function upsertSubscription(
  userId: string,
  data: Omit<NewSubscription, "id">,
): Promise<Subscription> {
  const [subscription] = await db
    .insert(subscriptions)
    .values({ ...data, userId })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        updatedAt: new Date(),
      },
    })
    .returning();
  return subscription;
}

export async function deleteSubscriptionsByCustomerId(
  stripeCustomerId: string,
): Promise<void> {
  const customer = await getStripeCustomerByCustomerId(stripeCustomerId);
  if (customer) {
    await db
      .delete(subscriptions)
      .where(eq(subscriptions.userId, customer.userId));
  }
}

// =============================================================================
// User Metrics
// =============================================================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUserMetrics(
  userId: string,
  month?: string,
): Promise<UserMetrics | null> {
  const targetMonth = month ?? getCurrentMonth();
  const metrics = await db.query.userMetrics.findFirst({
    where: and(
      eq(userMetrics.userId, userId),
      eq(userMetrics.month, targetMonth),
    ),
  });
  return metrics ?? null;
}

export async function createUserMetrics(
  userId: string,
  month?: string,
  chatRequests = 0,
): Promise<UserMetrics> {
  const targetMonth = month ?? getCurrentMonth();
  const [metrics] = await db
    .insert(userMetrics)
    .values({
      userId,
      month: targetMonth,
      chatRequests,
    })
    .returning();
  return metrics;
}

export async function incrementUserMetrics(
  userId: string,
  month?: string,
): Promise<UserMetrics> {
  const targetMonth = month ?? getCurrentMonth();

  // First try to update
  const [updated] = await db
    .update(userMetrics)
    .set({
      chatRequests: sql`${userMetrics.chatRequests} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(eq(userMetrics.userId, userId), eq(userMetrics.month, targetMonth)),
    )
    .returning();

  if (updated) {
    return updated;
  }

  // If no row was updated, create a new one
  return createUserMetrics(userId, targetMonth, 1);
}

export async function getOrCreateUserMetrics(
  userId: string,
  month?: string,
): Promise<UserMetrics> {
  const existing = await getUserMetrics(userId, month);
  if (existing) {
    return existing;
  }
  return createUserMetrics(userId, month);
}
