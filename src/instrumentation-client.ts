// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { initSentryClient, onRouterTransitionStart } from "./lib/sentry/client";

initSentryClient();

export { onRouterTransitionStart };
