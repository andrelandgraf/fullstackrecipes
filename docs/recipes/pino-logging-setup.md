### Step 1: Install Pino

```bash
bun add pino pino-pretty
```

- `pino` - Fast JSON logger for Node.js
- `pino-pretty` - Pretty-prints logs in development

### Step 2: Configure Next.js

Add `pino` to `serverExternalPackages` in `next.config.ts` to prevent Turbopack from bundling pino's dependencies (which include test files that break the build):

```typescript
const nextConfig: NextConfig = {
  // Externalize pino to prevent Turbopack from bundling thread-stream test files
  serverExternalPackages: ["pino"],
};
```

### Step 3: Add the logging config

Create a config file for the log level using configSchema:

```typescript
// src/lib/logging/config.ts
import { z } from "zod";
import { configSchema, server } from "@/lib/config/schema";

export const loggingConfig = configSchema("Logging", {
  level: server({
    env: "LOG_LEVEL",
    schema: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
  }),
});
```

### Step 4: Add the logger utility

{% registry items="logger" /%}

**Key features:**

- Uses `pino-pretty` in development for human-readable colorized output
- Outputs JSON in production (for log aggregation services)
- Log level configurable via `LOG_LEVEL` env var (defaults to `info`)
- Uses `mainConfig` for environment detection and `loggingConfig` for log level

---

## Usage

```typescript
import { logger } from "@/lib/logging/logger";

// Basic logging
logger.info("Server started", { port: 3000 });
logger.warn("Rate limit reached", { endpoint: "/api/chat" });

// Log errors with stack traces
logger.error(err, "Failed to process request");

// Add context
logger.info({ userId: "123", action: "login" }, "User logged in");
```

**Log levels** (ordered by severity): `trace`, `debug`, `info`, `warn`, `error`, `fatal`

---

## File Structure

```
src/lib/logging/
  config.ts    # Log level configuration with configSchema
  logger.ts    # Pino logger utility
```

---

## References

- [Pino Documentation](https://getpino.io/)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
