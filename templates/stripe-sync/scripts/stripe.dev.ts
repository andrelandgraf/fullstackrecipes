import { spawn } from "child_process";
import "@next/env";

const events = [
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

const origin = process.env.NEXT_PUBLIC_ORIGIN ?? "http://localhost:3000";
const url = `${origin}/api/stripe`;

console.log(`Forwarding Stripe webhooks to ${url}`);
console.log("Events:", events.join(", "));

const stripeProcess = spawn(
  "stripe",
  ["listen", "--events", events.join(","), "--forward-to", url],
  {
    stdio: "inherit",
  },
);

stripeProcess.on("error", (err) => {
  console.error("Failed to start Stripe CLI:", err);
  console.error(
    "Make sure Stripe CLI is installed: brew install stripe/stripe-cli/stripe",
  );
  process.exit(1);
});

stripeProcess.on("close", (code) => {
  process.exit(code ?? 0);
});
