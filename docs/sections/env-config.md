## Environment Variable Management

Type-safe server and client environment variable validation with a Drizzle-like schema API. Clear error messages if variables are missing, invalid, or accessed on the client.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/config-schema.json
```

This installs the `config/schema.ts` utility.

---

### Environment Files

We use `.env.local` for local environment secrets. This file is git-ignored and should contain any secrets or local overrides.

#### Next.js Load Order

Next.js loads environment variables in the following order, stopping once each variable is found:

1. `process.env`
2. `.env.$(NODE_ENV).local`
3. `.env.local` (not checked when `NODE_ENV` is `test`)
4. `.env.$(NODE_ENV)`
5. `.env`

For example, if `NODE_ENV` is `development` and you define a variable in both `.env.development.local` and `.env`, the value in `.env.development.local` will be used.

> **Note**: The allowed values for `NODE_ENV` are `production`, `development`, and `test`.

Note `next build` and `next start` will use the production environment variables while `next dev` will use the development environment variables.

#### Syncing with Vercel

When getting started, local, development, and production environments often share third-party resources like databases to move faster. Use the Vercel CLI to keep environment variables in sync.

We write to `.env.development` (not `.env.local`) so that local overrides in `.env.local` aren't deleted when pulling from Vercel.

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "env:pull": "vercel env pull .env.development --environment=development",
    "env:push": "vercel env push .env.development --environment=development"
  }
}
```

#### Local Overrides

Some variables differ between local and deployed environments (e.g., `BETTER_AUTH_URL` is `http://localhost:3000` locally). Use `.env.local` to override specific variables from `.env.development`:

```
.env.development     <- shared config from Vercel (DATABASE_URL, API keys, etc.)
.env.local           <- local overrides (BETTER_AUTH_URL, local-only settings)
```

Since `.local` files always take precedence over their non-local counterparts, your local overrides will be applied automatically.

#### Build vs Development Mode

Next.js commands run in different modes, which affects which env files are loaded:

| File                     | `next dev` | `next build` / `next start` |
| ------------------------ | ---------- | --------------------------- |
| `.env.development.local` | ✅         | ❌                          |
| `.env.development`       | ✅         | ❌                          |
| `.env.production.local`  | ❌         | ✅                          |
| `.env.production`        | ❌         | ✅                          |
| `.env.local`             | ✅         | ✅                          |
| `.env`                   | ✅         | ✅                          |

Pull the project's production environment variables if you want to build your project locally with `next build`:

```bash
vercel env pull .env.production --environment=production
```

#### Workflow

1. Run `bun run env:pull` to sync shared variables from Vercel to `.env.development`
2. Add local-only overrides to `.env.local`
3. When adding new shared variables, update `.env.development` and run `bun run env:push`

#### Loading Environment Variables in Scripts

Scripts and config files that run outside of Next.js (like Drizzle migrations or custom build scripts) don't have environment variables automatically loaded. Use `loadEnvConfig` from `@next/env` to load them manually:

```typescript
// scripts/db/generate-schema.ts
import { $ } from "bun";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

await $`bunx @better-auth/cli@latest generate --config src/lib/auth/server.tsx --output src/lib/auth/schema.ts`;

await $`drizzle-kit generate`;
```

The same pattern applies to config files like `drizzle.config.ts`:

```typescript
// drizzle.config.ts
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/*/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.server.url,
  },
});
```

> **Important:** Call `loadEnvConfig` before importing any modules that access `process.env`. Environment variables must be loaded before they're read.

---

### Basic Usage

The API uses a Drizzle-like schema pattern with `server()` and `pub()` field builders:

```typescript
// src/lib/db/config.ts
import { configSchema, server } from "@/lib/config/schema";

export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});
// Type: { server: { url: string } }
```

If `DATABASE_URL` is missing, you get a clear error:

```
Error [InvalidConfigurationError]: Configuration validation error for Database!
Did you correctly set all required environment variables in your .env* file?
 - server.url must be defined.
```

Then import and use it:

```typescript
// src/lib/db/client.ts
import { databaseConfig } from "./config";

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
```

### Server vs Public Fields

Use `server()` for server-only secrets and `pub()` for client-accessible values:

```typescript
import { configSchema, server, pub } from "@/lib/config/schema";

export const sentryConfig = configSchema(
  "Sentry",
  {
    // Server-only - throws if accessed on client
    token: server({ env: "SENTRY_AUTH_TOKEN" }),
    // Client-accessible - work everywhere
    dsn: pub({
      env: "NEXT_PUBLIC_SENTRY_DSN",
      value: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }),
    project: pub({
      env: "NEXT_PUBLIC_SENTRY_PROJECT",
      value: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    }),
  },
  {
    flag: {
      env: "NEXT_PUBLIC_ENABLE_SENTRY",
      value: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
    },
  },
);
```

**Why pass `value` for public fields?**

Next.js only inlines `NEXT_PUBLIC_*` environment variables when accessed statically (like `process.env.NEXT_PUBLIC_DSN`). Dynamic lookups like `process.env[varName]` don't work on the client. By passing `value` directly, the static references are preserved and properly inlined at build time.

Server fields can omit `value` since they use `process.env[env]` internally and are only accessed on the server.

### Feature Flags

Use the `flag` option for features that can be enabled/disabled:

```typescript
// src/lib/sentry/config.ts
import { configSchema, server, pub } from "@/lib/config/schema";

export const sentryConfig = configSchema(
  "Sentry",
  {
    token: server({ env: "SENTRY_AUTH_TOKEN" }),
    dsn: pub({
      env: "NEXT_PUBLIC_SENTRY_DSN",
      value: process.env.NEXT_PUBLIC_SENTRY_DSN,
    }),
    project: pub({
      env: "NEXT_PUBLIC_SENTRY_PROJECT",
      value: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    }),
    org: pub({
      env: "NEXT_PUBLIC_SENTRY_ORG",
      value: process.env.NEXT_PUBLIC_SENTRY_ORG,
    }),
  },
  {
    flag: {
      env: "NEXT_PUBLIC_ENABLE_SENTRY",
      value: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
    },
  },
);
// Type: FeatureConfig<...> (has isEnabled)
```

> **Important:** If your config has public fields, the flag must also use a `NEXT_PUBLIC_*` variable. Otherwise, the flag will be `undefined` on the client (since non-public env vars aren't inlined), causing `isEnabled` to always be `false` in client code even when the feature is enabled on the server.

Behavior:

- Flag not set or falsy: `{ isEnabled: false }` (no validation, no errors)
- Flag is `"true"`, `"1"`, or `"yes"`: validates all values, returns `{ ..., isEnabled: true }`
- Flag truthy + missing value: throws `InvalidConfigurationError`

Usage:

```typescript
// src/instrumentation.ts
import { sentryConfig } from "./lib/sentry/config";

export async function register() {
  if (sentryConfig.isEnabled) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: sentryConfig.public.dsn,
    });
  }
}
```

### Either-Or Values

Use the `oneOf` constraint when a feature can be configured with alternative credentials:

```typescript
// src/lib/ai/config.ts
import { configSchema, server, oneOf } from "@/lib/config/schema";

export const aiConfig = configSchema(
  "AI",
  {
    oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
    gatewayApiKey: server({ env: "AI_GATEWAY_API_KEY" }),
  },
  {
    constraints: (s) => [oneOf([s.oidcToken, s.gatewayApiKey])],
  },
);
// Type: { server: { oidcToken?: string; gatewayApiKey?: string } }
// Note: No isEnabled property (no flag used)
```

At least one of the specified fields must have a value. Error messages include the alternatives:

```
Error [InvalidConfigurationError]: Configuration validation error for AI!
Did you correctly set all required environment variables in your .env* file?
 - Either server.oidcToken or server.gatewayApiKey must be defined.
```

### Combining Flag and Constraints

You can use both `flag` and `constraints` together:

```typescript
export const myConfig = configSchema(
  "MyFeature",
  {
    token: server({ env: "TOKEN" }),
    backupToken: server({ env: "BACKUP_TOKEN" }),
  },
  {
    flag: { env: "ENABLE_FEATURE", value: process.env.ENABLE_FEATURE },
    constraints: (s) => [oneOf([s.token, s.backupToken])],
  },
);
// Type: FeatureConfig<...> (has isEnabled because flag is used)
```

### Optional Fields

Use `optional: true` for fields that are always optional:

```typescript
export const authConfig = configSchema("Auth", {
  secret: server({ env: "BETTER_AUTH_SECRET" }),
  url: server({ env: "BETTER_AUTH_URL" }),
  vercelClientId: server({ env: "VERCEL_CLIENT_ID", optional: true }),
  vercelClientSecret: server({ env: "VERCEL_CLIENT_SECRET", optional: true }),
});
```

### Client-Side Protection

Server fields use a Proxy to protect values from being accessed on the client:

```typescript
// On the server - everything works
sentryConfig.public.dsn; // "https://..."
sentryConfig.server.token; // "secret-token"

// On the client
sentryConfig.public.dsn; // works (public field)
sentryConfig.server.token; // throws ServerConfigClientAccessError
```

This catches accidental client-side access to secrets at runtime:

```
Error [ServerConfigClientAccessError]: Attempted to access server-only config 'server.token' on client.
Move this value to 'public' if it needs client access, or ensure this code only runs on server.
```

### Custom Validation

For transforms, defaults, or complex validation, pass a `schema` option with a Zod schema:

```typescript
import { z } from "zod";
import { configSchema, server } from "@/lib/config/schema";

export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
  // Transform string to number with default
  poolSize: server({
    env: "DATABASE_POOL_SIZE",
    schema: z.coerce.number().default(10),
  }),
});
// Type: { server: { url: string; poolSize: number } }
```

More examples:

```typescript
import { z } from "zod";
import { configSchema, server } from "@/lib/config/schema";

export const config = configSchema("App", {
  // Required string (default)
  apiKey: server({ env: "API_KEY" }),

  // Optional string
  debugMode: server({
    env: "DEBUG_MODE",
    schema: z.string().optional(),
  }),

  // String with regex validation
  fromEmail: server({
    env: "FROM_EMAIL",
    schema: z
      .string()
      .regex(/^.+\s<.+@.+\..+>$/, 'Must match "Name <email>" format'),
  }),

  // Enum with default
  nodeEnv: server({
    env: "NODE_ENV",
    schema: z
      .enum(["development", "production", "test"])
      .default("development"),
  }),

  // Boolean
  enableFeature: server({
    env: "ENABLE_FEATURE",
    schema: z.coerce.boolean().default(false),
  }),
});
```

### Validating Configs on Server Start

Some environment variables are read internally by packages rather than passed as arguments. To catch missing variables early instead of at runtime, import your configs in `instrumentation.ts`:

```typescript
// src/instrumentation.ts
import * as Sentry from "@sentry/nextjs";
import { sentryConfig } from "./lib/sentry/config";

// Validate required configs on server start
import "./lib/ai/config";
import "./lib/db/config";

export async function register() {
  // ... initialization code
}
```

The side-effect imports trigger `configSchema` validation immediately when the server starts. If any required environment variable is missing, the server fails to start with a clear error rather than failing later when the code path is executed.

### Adding New Environment Variables

When adding a new feature that needs env vars:

1. Create `src/lib/<feature>/config.ts`
2. Use `configSchema` with `server()` and/or `pub()` fields
3. Add `flag` option if the feature should be toggleable
4. Add `constraints` option with `oneOf()` for either-or validation
5. Import the config in `src/instrumentation.ts` for early validation
6. Import and use the config within that feature

Example for adding Stripe:

```typescript
// src/lib/stripe/config.ts
import { configSchema, server, pub } from "@/lib/config/schema";

export const stripeConfig = configSchema("Stripe", {
  secretKey: server({ env: "STRIPE_SECRET_KEY" }),
  webhookSecret: server({ env: "STRIPE_WEBHOOK_SECRET" }),
  publishableKey: pub({
    env: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    value: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  }),
});
```

Then use it in your Stripe client:

```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe";
import { stripeConfig } from "./config";

export const stripe = new Stripe(stripeConfig.server.secretKey);
```
