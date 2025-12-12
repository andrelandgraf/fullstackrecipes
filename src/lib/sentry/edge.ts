import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./config";

export function initSentryEdge() {
  if (!sentryConfig.isEnabled) return;

  Sentry.init({
    dsn: sentryConfig.dsn,
    tracesSampleRate: 1,
    enableLogs: true,
    sendDefaultPii: true,
  });
}
