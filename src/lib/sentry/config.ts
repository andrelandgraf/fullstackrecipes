import { configSchema, server, pub } from "@/lib/config/schema";

export const sentryConfig = configSchema(
  "Sentry",
  {
    // SENTRY_AUTH_TOKEN is picked up by the Sentry Build Plugin for source maps upload.
    // Accessing this on the client will throw ServerConfigClientAccessError.
    token: server({ env: "SENTRY_AUTH_TOKEN" }),
    dsn: pub({
      env: "NEXT_PUBLIC_SENTRY_DSN",
      value: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }),
    project: pub({
      env: "NEXT_PUBLIC_SENTRY_PROJECT",
      value: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    }),
    org: pub({
      env: "NEXT_PUBLIC_SENTRY_ORG",
      value: process.env.NEXT_PUBLIC_SENTRY_ORG,
    }),
  },
  {
    flag: {
      env: "NEXT_PUBLIC_ENABLE_SENTRY",
      value: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
    },
  },
);
