## AI Coding Agent Configuration

This guide helps you configure AI coding agents (like Cursor, GitHub Copilot, Claude Code, or similar tools) to follow consistent patterns when working with your codebase.

### Step 1: Create an agents.md file

Create an `agents.md` file in your project root. This file provides coding guidelines and patterns for AI assistants to follow.

```markdown
# Patterns

- Everything is a library: Organize features and domains as self-contained folders in `src/lib/` (e.g., `chat`, `ai`, `db`). Co-locate schema, queries, types, and utilities together. Components go in `components/<feature>/`.
- Use the web platform: Prefer native APIs and standards. Avoid abstractions that hide what the code actually does.

# Coding Guidelines

## Runtime and Package Manager

- Use Bun instead of Node.js, npm, pnpm, or vite.
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`.
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`.
- Bun automatically loads .env, so don't use dotenv.

## TypeScript

- Only create an abstraction if it's actually needed
- Prefer clear function/variable names over inline comments
- Avoid helper functions when a simple inline expression would suffice
- Don't use emojis
- No barrel index files - just export from the source files instead
- No type.ts files, just inline types or co-locate them with their related code
- Don't unnecessarily add `try`/`catch`
- Don't cast to `any`

## React

- Avoid massive JSX blocks and compose smaller components
- Colocate code that changes together
- Avoid `useEffect` unless absolutely needed

## Tailwind

- Mostly use built-in values, occasionally allow dynamic values, rarely globals
- Always use v4 + global CSS file format + shadcn/ui

## Next

- Prefer fetching data in RSC (page can still be static)
- Use next/font + next/script when applicable
- next/image above the fold should have `sync` / `eager` / use `priority` sparingly
- Be mindful of serialized prop size for RSC → child components
```

> This `agents.md` file is based on [Lee Robinson's](https://x.com/leerob) original [shared here](https://x.com/leerob/status/1993162978410004777).

### Step 2: Configure MCP Servers

Fullstackrecipes recommends using MCP (Model Context Protocol) servers to enhance your coding agent's capabilities. Different recipes may introduce additional MCP servers. For now, start by adding these to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    },
    "better-auth": {
      "url": "https://mcp.chonkie.ai/better-auth/better-auth-builder/mcp"
    },
    "resend": {
      "url": "https://resend.com/docs/mcp"
    },
    "fullstackrecipes": {
      "url": "https://fullstackrecipes.com/api/mcp"
    }
  }
}
```

| Server             | Description                                                      |
| ------------------ | ---------------------------------------------------------------- |
| `next-devtools`    | Next.js development tools for debugging, routing, and build info |
| `context7`         | Up-to-date documentation lookup for any library                  |
| `better-auth`      | Better Auth framework documentation and API reference            |
| `resend`           | Resend email API documentation and examples                      |
| `fullstackrecipes` | Fullstackrecipes recipes                                         |

> **Note:** Remove any MCP servers for tools you don't plan to use in your project. For example, if you're not using Better Auth for authentication, remove the `better-auth` entry.

### Step 3: Add Cursor Rules for specific tools (optional)

Some tools benefit from dedicated Cursor rules files that provide detailed API guidance. These are kept separate from `agents.md` to avoid overloading context in every request.

| Rule File                 | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `.cursor/rules/sentry.md` | Sentry tracing, logging, and exception handling patterns |

#### `.cursor/rules/sentry.md`

````markdown
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

```tsx
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";
        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);
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
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaninful for the activities in the call.

Attach attributes based on relevant information and metrics from the request

```typescript
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
```

# Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`

Enable logging in Sentry using `Sentry.init({  enableLogs: true })`

Reference the logger using `const { logger } = Sentry`

Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.(js|ts)`, the server initialization is in `sentry.server.config.ts` and the edge initialization is in `sentry.edge.config.ts`

Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://your-dsn@sentry.io/your-project-id",
  enableLogs: true,
});
```

### Logger Integration

```typescript
Sentry.init({
  dsn: "https://your-dsn@sentry.io/your-project-id",
  integrations: [
    // send console.log, console.warn, and console.error calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```typescript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```
````

---

## References

- [Cursor Rules Documentation](https://docs.cursor.com/context/rules-for-ai)
- [GitHub Copilot Instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot)
