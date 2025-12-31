import Stripe from "stripe";
import { getStripeClient } from "./client";
import { stripeConfig } from "./config";
import {
  getStripeCustomerByCustomerId,
  upsertSubscription,
  deleteSubscriptionsByCustomerId,
} from "./queries";
import type { SubscriptionStatus } from "./schema";

const allowedEventTypes = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
] as const;

type AllowedEventType = (typeof allowedEventTypes)[number];

function isAllowedEventType(
  event: Stripe.Event,
): event is Stripe.Event & { type: AllowedEventType } {
  return allowedEventTypes.includes(event.type as AllowedEventType);
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
): { success: true; event: Stripe.Event } | { success: false; error: Error } {
  const stripe = getStripeClient();
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeConfig.server.webhookSecret,
    );
    return { success: true, event };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (!isAllowedEventType(event)) {
    console.log(`Ignoring untracked Stripe event: ${event.type}`);
    return;
  }

  const { customer } = event.data.object as {
    customer?: string | Stripe.Customer;
  };
  const customerId = typeof customer === "string" ? customer : customer?.id;

  if (!customerId) {
    console.log(`No customer ID found in event: ${event.type}`);
    return;
  }

  await syncStripeData(customerId);
}

export async function syncStripeData(customerId: string): Promise<void> {
  const stripe = getStripeClient();
  const stripeCustomer = await getStripeCustomerByCustomerId(customerId);

  if (!stripeCustomer) {
    console.log(`Stripe customer not found in database: ${customerId}`);
    return;
  }

  const subscriptionsList = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
    expand: ["data.default_payment_method"],
  });

  if (subscriptionsList.data.length === 0) {
    await deleteSubscriptionsByCustomerId(customerId);
    return;
  }

  const subscriptionData = subscriptionsList.data[0];

  await upsertSubscription(stripeCustomer.userId, {
    userId: stripeCustomer.userId,
    stripeSubscriptionId: subscriptionData.id,
    status: subscriptionData.status as SubscriptionStatus,
    stripePriceId: subscriptionData.items.data[0].price.id,
    currentPeriodStart: new Date(subscriptionData.current_period_start * 1000),
    currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
    cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
  });
}
