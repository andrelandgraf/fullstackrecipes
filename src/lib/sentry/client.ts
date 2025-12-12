import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./config";

export function initSentryClient() {
  Sentry.init({
    dsn: sentryConfig.dsn,
    integrations: [Sentry.replayIntegration()],
    tracesSampleRate: 1,
    enableLogs: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
