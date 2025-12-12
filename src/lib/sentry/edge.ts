import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./config";

export function initSentryEdge() {
  Sentry.init({
    dsn: sentryConfig.dsn,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
    integrations: [
      Sentry.pinoIntegration({ log: { levels: ["info", "warn", "error"] } }),
    ],
  });
}
