## Sentry Setup

Set up [Sentry](https://sentry.io) for error tracking, performance monitoring, and log aggregation in your Next.js app. Integrates with Pino to forward logs to Sentry automatically.

### Step 1: Run the Sentry Wizard

Create a new Sentry project, then configure your app automatically by running the Sentry wizard in your project root. You can find the personalized command in the Sentry getting-started guide during project creation.

```bash
bunx @sentry/wizard@latest -i nextjs --saas --org <org-name> --project <project-name>
```

**Wizard selections:**

- Runtime: **Bun**
- Route requests through your Next.js server: **Yes** (optional, recommended for privacy)
- Enable Tracing: **Yes**
- Session Replay: **Yes**
- Logs: **Yes**
- Example page: **No**
- Add Sentry MCP server: **Yes**

The wizard creates these files:

- `sentry.server.config.ts` - Server-side initialization
- `sentry.edge.config.ts` - Edge runtime initialization
- `src/instrumentation-client.ts` - Client-side initialization
- `src/instrumentation.ts` - Instrumentation hook

---

### Step 2: Add environment variables

Add to your `.env.local`:

```env
SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
SENTRY_PROJECT="your-project-name"
SENTRY_ORG="your-org-name"
```

Get these values from your Sentry project settings. While not secrets (they're loaded in the client), using env variables keeps them out of your repo.

---

### Step 3: Create the Sentry config

Create `src/lib/sentry/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const SentryConfigSchema = z.object({
  dsn: z.string("SENTRY_DSN must be defined."),
  project: z.string("SENTRY_PROJECT must be defined."),
  org: z.string("SENTRY_ORG must be defined."),
});

export type SentryConfig = z.infer<typeof SentryConfigSchema>;

const config: PreValidate<SentryConfig> = {
  dsn: process.env.SENTRY_DSN,
  project: process.env.SENTRY_PROJECT,
  org: process.env.SENTRY_ORG,
};

export const sentryConfig = validateConfig(SentryConfigSchema, config);
```

---

### Step 4: Create the initialization helpers

Create `src/lib/sentry/server.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./config";

export function initSentryServer() {
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
```

Create `src/lib/sentry/edge.ts`:

```typescript
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
```

Create `src/lib/sentry/client.ts`:

```typescript
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
```

---

### Step 5: Update the wizard-generated files

Replace `sentry.server.config.ts` (in project root):

```typescript
// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { initSentryServer } from "./src/lib/sentry/server";

initSentryServer();
```

Replace `sentry.edge.config.ts` (in project root):

```typescript
// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { initSentryEdge } from "./src/lib/sentry/edge";

initSentryEdge();
```

Replace `src/instrumentation-client.ts`:

```typescript
// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { initSentryClient, onRouterTransitionStart } from "./lib/sentry/client";

initSentryClient();

export { onRouterTransitionStart };
```

The `src/instrumentation.ts` file stays as the wizard generated it:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
```

---

### Database query monitoring

When tracing is enabled (`tracesSampleRate > 0`), Sentry automatically instruments database queries using `postgresIntegration`. This is included by default - no additional configuration needed.

**What you get automatically:**

- All `pg` (node-postgres) queries captured as spans
- Query timing and slow query detection
- Database performance visible in Sentry's Performance tab
- Works with Drizzle ORM since it uses `node-postgres` under the hood

This uses OpenTelemetry instrumentation (`@opentelemetry/instrumentation-pg`) to hook into the `pg` library. Supports `pg` versions 8.x.

**To disable or customize** (if needed):

```typescript
Sentry.init({
  dsn: "...",
  tracesSampleRate: 1,
  integrations: (defaults) => {
    // Remove postgres integration
    return defaults.filter((i) => i.name !== "Postgres");
  },
});
```

---

### Step 6: Create Cursor rules for Sentry

Create `.cursor/rules/sentry.md` to help AI coding agents use Sentry APIs correctly:

```markdown
These examples should be used as guidance when configuring Sentry functionality within a project.

# Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.

Use this in try catch blocks or areas where exceptions are expected

# Tracing Examples

Spans should be created for meaningful actions within an applications like button clicks, API calls, and function calls

Use the `Sentry.startSpan` function to create a span

Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaninful for the activities in the call.

Attach attributes based on relevant information and metrics from the request

\`\`\`javascript
function TestComponent() {
const handleTestButtonClick = () => {
Sentry.startSpan(
{
op: "ui.click",
name: "Test Button Click",
},
(span) => {
span.setAttribute("config", "some config");
span.setAttribute("metric", "some metric");
doSomething();
},
);
};
return (
<button type="button" onClick={handleTestButtonClick}>
Test Sentry
</button>
);
}
\`\`\`

## Custom span instrumentation in API calls

\`\`\`javascript
async function fetchUserData(userId) {
return Sentry.startSpan(
{
op: "http.client",
name: `GET /api/users/${userId}`,
},
async () => {
const response = await fetch(`/api/users/${userId}`);
const data = await response.json();
return data;
},
);
}
\`\`\`

# Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.(js|ts)`, the server initialization is in `sentry.server.config.ts` and the edge initialization is in `sentry.edge.config.ts`

You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality
```

---

## File Structure

After setup, you'll have these Sentry-related files:

```
sentry.server.config.ts        # Imports and calls initSentryServer()
sentry.edge.config.ts          # Imports and calls initSentryEdge()
src/
  instrumentation.ts           # Next.js instrumentation hook (wizard-generated)
  instrumentation-client.ts    # Imports and calls initSentryClient()
  lib/sentry/
    config.ts                  # Validates SENTRY_DSN, SENTRY_PROJECT, SENTRY_ORG
    server.ts                  # initSentryServer() with pino integration
    edge.ts                    # initSentryEdge() with pino integration
    client.ts                  # initSentryClient() with replay integration
.cursor/rules/
  sentry.md                    # AI agent guidelines for Sentry
```

---

## References

- [Sentry Pino Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/pino/)
- [Sentry Postgres Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/postgres/)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/)
