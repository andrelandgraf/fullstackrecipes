import { loadConfig } from "../common/load-config";

export const sentryConfig = loadConfig({
  name: "Sentry",
  flag: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
  server: {
    // SENTRY_AUTH_TOKEN is picked up by the Sentry Build Plugin for source maps upload.
    // Accessing this on the client will throw ServerConfigClientAccessError.
    token: process.env.SENTRY_AUTH_TOKEN,
  },
  public: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  },
});
