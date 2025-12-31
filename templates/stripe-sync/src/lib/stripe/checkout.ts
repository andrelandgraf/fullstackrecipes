import { redirect } from "next/navigation";
import { getStripeClient } from "./client";
import { stripeConfig } from "./config";
import { getStripeCustomer, createStripeCustomer } from "./queries";
import { getProPlan } from "./plans";

export async function createStripeCustomerInStripe({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const stripe = getStripeClient();
  const customer = await stripe.customers.create(
    {
      email,
      name: name ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: userId },
  );
  return customer.id;
}

export async function redirectToCheckout({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<never> {
  const stripe = getStripeClient();
  const origin = stripeConfig.public.origin;

  // Get or create Stripe customer
  let customer = await getStripeCustomer(userId);
  let stripeCustomerId = customer?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customerId = await createStripeCustomerInStripe({
      userId,
      email,
      name,
    });
    stripeCustomerId = customerId;
    await createStripeCustomer({
      userId,
      stripeCustomerId,
    });
  }

  // Get PRO plan price
  const proPlan = getProPlan();

  if (!proPlan.priceId) {
    throw new Error("PRO plan price ID is not configured");
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: proPlan.priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${origin}/api/stripe`,
    cancel_url: `${origin}/api/stripe`,
    metadata: { userId },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  redirect(checkoutSession.url);
}

export async function redirectToBillingPortal({
  userId,
}: {
  userId: string;
}): Promise<never> {
  const stripe = getStripeClient();
  const origin = stripeConfig.public.origin;
  const customer = await getStripeCustomer(userId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${origin}/settings`,
  });

  redirect(portalSession.url);
}
