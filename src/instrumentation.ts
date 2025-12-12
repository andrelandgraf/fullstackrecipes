import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./lib/sentry/config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initSentryServer } = await import("./lib/sentry/server");
    initSentryServer();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    const { initSentryEdge } = await import("./lib/sentry/edge");
    initSentryEdge();
  }
}

export const onRequestError = sentryConfig.isEnabled
  ? Sentry.captureRequestError
  : undefined;
