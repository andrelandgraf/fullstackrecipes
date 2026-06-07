---
name: using-sentry
description: Capture exceptions, attach user/context, add spans and breadcrumbs, and log via the Sentry SDK. Use when instrumenting errors, performance, or context in app code.
---

# Working with Sentry

Capture exceptions, add context, trace performance, and log with Sentry.

## Prerequisites

Complete these setup recipes first:

- Sentry Setup

### Capturing Exceptions

Capture errors that are handled but still worth tracking.

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await riskyOperation();
} catch (err) {
  Sentry.captureException(err);
}
```

### Adding Context

`setUser` persists for the session. Attach `tags` (indexed, filterable) and `extra` (arbitrary detail) per exception.

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.setUser({ id: session.user.id, email: session.user.email });

Sentry.captureException(err, {
  tags: { feature: "checkout", plan: "pro" },
  extra: { orderId: "order_123", items: cart.items },
});
```

Clear the user on sign out.

```typescript
Sentry.setUser(null);
```

### Performance Tracing

Wrap meaningful operations in `startSpan`. The sync form receives the `span` for attributes.

```typescript
import * as Sentry from "@sentry/nextjs";

const users = await Sentry.startSpan(
  { op: "http.client", name: "GET /api/users" },
  async () => (await fetch("/api/users")).json(),
);

Sentry.startSpan({ op: "ui.click", name: "Submit Button Click" }, (span) => {
  span.setAttribute("form", "checkout");
  processSubmit();
});
```

### Breadcrumbs

Console logs, fetches, and UI clicks are captured automatically. Add manual breadcrumbs for custom events.

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.addBreadcrumb({
  category: "auth",
  message: "User signed in",
  level: "info",
});
```

### Sentry Logger

Structured logs surface in the Logs tab.

```typescript
import * as Sentry from "@sentry/nextjs";

const { logger } = Sentry;

logger.info("Payment processed", { orderId: "123", amount: 99.99 });
logger.warn("Rate limit approaching", { current: 90, max: 100 });
logger.error("Payment failed", { orderId: "123", reason: "declined" });
```

---

## References

- [Sentry Next.js SDK](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Custom Instrumentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/instrumentation/custom-instrumentation/)
