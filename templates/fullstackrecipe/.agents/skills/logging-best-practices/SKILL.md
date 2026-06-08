---
name: logging-best-practices
description: Emit structured logs with Pino (levels, context-first signature, workflow-safe step wrapper). Use when adding logging to routes, libraries, or workflows.
---

# Logging Best Practices

Emit structured logs with Pino throughout the app.

## Prerequisites

Complete these setup recipes first:

- Pino Logging Setup

### Logging

Import `logger` from `@/lib/logging/logger`. Pass a context object first, message second. For errors, put `err` in the context object.

```typescript
import { logger } from "@/lib/logging/logger";

logger.info({ port: 3000 }, "Server started");
logger.warn({ endpoint: "/api/chat" }, "Rate limit reached");
logger.debug({ key: "user:123" }, "Cache miss");
logger.error({ err, userId: "123", endpoint: "/api/chat" }, "Request failed");
```

### Levels

| Level   | When to Use                              |
| ------- | ---------------------------------------- |
| `trace` | Detailed debugging (rarely used)         |
| `debug` | Development troubleshooting              |
| `info`  | Normal operations, business events       |
| `warn`  | Recoverable issues, deprecation warnings |
| `error` | Failures that need attention             |
| `fatal` | Critical failures, app cannot continue   |

Set the active threshold via `LOG_LEVEL` (defaults to `info`). Use `warn` in production.

```env
LOG_LEVEL="debug"
```

### In API Routes

Log on the way out with timing context.

```typescript
import { logger } from "@/lib/logging/logger";

export async function POST(request: Request) {
  const start = Date.now();
  try {
    const result = await processRequest(request);
    logger.info(
      { duration: Date.now() - start, status: 200 },
      "Request completed",
    );
    return Response.json(result);
  } catch (err) {
    logger.error({ err, duration: Date.now() - start }, "Request failed");
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
```

### In Workflows

The workflow runtime can't import Node modules, so the logger can't be called directly. Wrap it in a `"use step"` function.

```typescript
// src/workflows/chat/steps/logger.ts
import { logger } from "@/lib/logging/logger";

export async function log(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  "use step";

  if (data) {
    logger[level](data, message);
  } else {
    logger[level](message);
  }
}
```

```typescript
import { log } from "./steps/logger";

export async function chatWorkflow({ chatId }) {
  "use workflow";

  await log("info", "Workflow started", { chatId });
}
```

---

## References

- [Pino Documentation](https://getpino.io/)
- [Pino Log Levels](https://getpino.io/#/docs/api?id=levels)
