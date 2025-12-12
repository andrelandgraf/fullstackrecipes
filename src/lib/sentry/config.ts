import { loadConfig } from "../common/load-config";

export const sentryConfig = loadConfig({
  name: "Sentry",
  flag: "ENABLE_SENTRY",
  env: {
    dsn: "NEXT_PUBLIC_SENTRY_DSN",
    project: "NEXT_PUBLIC_SENTRY_PROJECT",
    org: "NEXT_PUBLIC_SENTRY_ORG",
    // SENTRY_AUTH_TOKEN is picked up by the Sentry Build Plugin for source maps upload.
    // Accessing this on the client will throw ServerConfigClientAccessError.
    token: "SENTRY_AUTH_TOKEN",
  },
});
