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

### Step 3: Add the logger utility

{% registry items="logger" /%}

**Key features:**

- Uses `pino-pretty` in development for human-readable colorized output
- Outputs JSON in production (for log aggregation services)
- Log level configurable via `PINO_LOG_LEVEL` env var (defaults to `info`)

---

## Usage

```typescript
import { logger } from "@/lib/common/logger";

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
src/lib/common/
  logger.ts    # Pino logger utility
```

---

## References

- [Pino Documentation](https://getpino.io/)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
