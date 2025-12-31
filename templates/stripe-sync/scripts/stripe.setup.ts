import Stripe from "stripe";
import "@next/env";

const secretKey = process.env.STRIPE_SECRET_KEY;
const origin = process.env.NEXT_PUBLIC_ORIGIN;

if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is required");
  process.exit(1);
}

if (!origin) {
  console.error("NEXT_PUBLIC_ORIGIN is required");
  process.exit(1);
}

const stripe = new Stripe(secretKey, {
  apiVersion: "2025-04-30.basil",
});

const url = `${origin}/api/stripe`;

const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
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
];

async function main() {
  console.log(`Creating webhook endpoint at ${url}`);

  const webhook = await stripe.webhookEndpoints.create({
    url,
    enabled_events: events,
    description: "Production webhook endpoint",
  });

  console.log("\nWebhook created successfully!");
  console.log("\nWebhook ID:", webhook.id);
  console.log("Webhook URL:", webhook.url);
  console.log("\nWebhook signing secret:", webhook.secret);
  console.log("\nAdd this to your .env.development as STRIPE_WEBHOOK_SECRET");
}

main().catch((error) => {
  console.error("Failed to create webhook:", error);
  process.exit(1);
});
