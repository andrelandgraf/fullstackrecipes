import { configSchema, server, pub } from "@/lib/config/schema";

export const stripeConfig = configSchema("Stripe", {
  secretKey: server({ env: "STRIPE_SECRET_KEY" }),
  webhookSecret: server({ env: "STRIPE_WEBHOOK_SECRET" }),
  proPriceId: server({ env: "STRIPE_PRO_PRICE_ID" }),
  origin: pub({
    env: "NEXT_PUBLIC_ORIGIN",
    value: process.env.NEXT_PUBLIC_ORIGIN,
  }),
});
