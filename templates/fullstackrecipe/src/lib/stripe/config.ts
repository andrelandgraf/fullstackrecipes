import { configSchema, server, pub } from "better-env/config-schema";

// Stripe is optional: the template builds and runs without billing configured.
// Set NEXT_PUBLIC_ENABLE_STRIPE=true and provide the keys to turn billing on.
export const stripeConfig = configSchema(
  "Stripe",
  {
    secretKey: server({ env: "STRIPE_SECRET_KEY" }),
    webhookSecret: server({ env: "STRIPE_WEBHOOK_SECRET" }),
    proPriceId: server({ env: "STRIPE_PRO_PRICE_ID" }),
    origin: pub({
      env: "NEXT_PUBLIC_ORIGIN",
      value: process.env.NEXT_PUBLIC_ORIGIN,
    }),
  },
  {
    flag: {
      env: "NEXT_PUBLIC_ENABLE_STRIPE",
      value: process.env.NEXT_PUBLIC_ENABLE_STRIPE,
    },
  },
);
