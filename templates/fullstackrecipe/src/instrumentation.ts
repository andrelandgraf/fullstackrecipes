import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./lib/sentry/config";

// Validate required configs on server start
import "./lib/db/config";
import "./lib/ai/config";
import "./lib/auth/config";
import "./lib/resend/config";

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
