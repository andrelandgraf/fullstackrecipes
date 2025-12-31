import Stripe from "stripe";
import { stripeConfig } from "./config";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeConfig.server.secretKey, {
      apiVersion: "2025-04-30.basil",
      typescript: true,
    });
  }
  return stripeClient;
}
