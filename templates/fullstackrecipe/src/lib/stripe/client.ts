import Stripe from "stripe";
import { assert } from "@/lib/common/assert";
import { stripeConfig } from "./config";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    assert(
      stripeConfig.isEnabled,
      "Stripe is not enabled. Set NEXT_PUBLIC_ENABLE_STRIPE=true and the STRIPE_* keys.",
    );
    stripeClient = new Stripe(stripeConfig.server.secretKey, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeClient;
}
