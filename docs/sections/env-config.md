## Environment Variable Management

Type-safe server and client environment variable validation with explicit `server` and `public` sections. Clear error messages if variables are missing, invalid, or accessed on the client.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/load-config.json
```

This installs the `load-config.ts` utility.

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

#### Workflow

1. Run `bun run env:pull` to sync shared variables from Vercel to `.env.development`
2. Add local-only overrides to `.env.local`
3. When adding new shared variables, update `.env.development` and run `bun run env:push`

---

### Basic Usage

Each feature lib defines its own config file with explicit `server` and `public` sections:

```typescript
// src/lib/db/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  server: {
    url: process.env.DATABASE_URL,
  },
});
// Type: { server: { url: string } }
```

If `DATABASE_URL` is missing, you get a clear error:

```
Error [InvalidConfigurationError]: Configuration validation error!
Did you correctly set all required environment variables in your .env* file?
 - server.url must be defined.
```

Then import and use it:

```typescript
import { databaseConfig } from "./config";

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
```

### Server vs Public Sections

The API explicitly separates server-only and client-accessible variables:

```typescript
export const sentryConfig = loadConfig({
  name: "Sentry",
  flag: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
  server: {
    // Server-only values - throws if accessed on client
    token: process.env.SENTRY_AUTH_TOKEN,
  },
  public: {
    // Client-accessible values - work everywhere
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
  },
});
```

**Why pass values directly?**

Next.js only inlines `NEXT_PUBLIC_*` environment variables when accessed statically (like `process.env.NEXT_PUBLIC_DSN`). Dynamic lookups like `process.env[varName]` don't work on the client. By passing values directly, the static references are preserved and properly inlined at build time.

### Optional Feature Flags

Use the `flag` parameter for features that can be enabled/disabled:

```typescript
// src/lib/sentry/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const sentryConfig = loadConfig({
  name: "Sentry",
  flag: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
  server: {
    token: process.env.SENTRY_AUTH_TOKEN,
  },
  public: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
    org: process.env.NEXT_PUBLIC_SENTRY_ORG,
  },
});
// Type: FeatureConfig<...>
```

> **Important:** If your config has a `public` section, the `flag` must also use a `NEXT_PUBLIC_*` variable. Otherwise, the flag will be `undefined` on the client (since non-public env vars aren't inlined), causing `isEnabled` to always be `false` in client code even when the feature is enabled on the server.

Behavior:

- Flag not set or falsy → `{ isEnabled: false }` (no validation, no errors)
- Flag is `"true"`, `"1"`, or `"yes"` → validates all values, returns `{ ..., isEnabled: true }`
- Flag truthy + missing value → throws `InvalidConfigurationError`

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

Use the `optional` parameter to create conditional dependencies between values. This is useful when a feature can be configured with alternative credentials.

```typescript
// src/lib/ai/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  server: {
    // Either oidcToken or gatewayApiKey must be set
    oidcToken: {
      value: process.env.VERCEL_OIDC_TOKEN,
      optional: "gatewayApiKey",
    },
    gatewayApiKey: {
      value: process.env.AI_GATEWAY_API_KEY,
      optional: "oidcToken",
    },
  },
});
// Type: { server: { oidcToken?: string; gatewayApiKey?: string } }
```

The `optional` parameter accepts:

| Value                  | Behavior                                         |
| ---------------------- | ------------------------------------------------ |
| `undefined` or `false` | Required (default)                               |
| `true`                 | Always optional                                  |
| `'otherKey'`           | Optional if `otherKey` in same section has value |
| `['keyA', 'keyB']`     | Optional if any of the listed keys have values   |

Error messages include the alternative:

```
Error [InvalidConfigurationError]: Configuration validation error!
Did you correctly set all required environment variables in your .env* file?
 - Either server.oidcToken or server.gatewayApiKey must be defined.
```

### Client-Side Protection

The `server` section uses a Proxy to protect values from being accessed on the client:

```typescript
// On the server - everything works
sentryConfig.public.dsn; // ✓ "https://..."
sentryConfig.server.token; // ✓ "secret-token"

// On the client
sentryConfig.public.dsn; // ✓ works (public section)
sentryConfig.server.token; // ✗ throws ServerConfigClientAccessError
```

This catches accidental client-side access to secrets at runtime:

```
Error [ServerConfigClientAccessError]: Attempted to access server-only config 'server.token' on client.
Move this value to 'public' if it needs client access, or ensure this code only runs on server.
```

### Advanced Validation

For transforms, defaults, or complex validation, pass a full object with `value` and `schema`:

```typescript
import { z } from "zod";
import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  server: {
    url: process.env.DATABASE_URL,
    // Transform string to number with default
    poolSize: {
      value: process.env.DATABASE_POOL_SIZE,
      schema: z.coerce.number().default(10),
    },
  },
});
// Type: { server: { url: string; poolSize: number } }
```

More examples:

```typescript
export const config = loadConfig({
  server: {
    // Required string (simple)
    apiKey: process.env.API_KEY,

    // Optional string
    debugMode: { value: process.env.DEBUG_MODE, schema: z.string().optional() },

    // String with regex validation
    fromEmail: {
      value: process.env.FROM_EMAIL,
      schema: z
        .string()
        .regex(/^.+\s<.+@.+\..+>$/, 'Must match "Name <email>" format'),
    },

    // Enum with default
    nodeEnv: {
      value: process.env.NODE_ENV,
      schema: z
        .enum(["development", "production", "test"])
        .default("development"),
    },

    // Boolean
    enableFeature: {
      value: process.env.ENABLE_FEATURE,
      schema: z.coerce.boolean().default(false),
    },
  },
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

The side-effect imports trigger `loadConfig` validation immediately when the server starts. If any required environment variable is missing, the server fails to start with a clear error rather than failing later when the code path is executed.

### Adding New Environment Variables

When adding a new feature that needs env vars:

1. Create `src/lib/<feature>/config.ts`
2. Use `loadConfig` with `server` and/or `public` sections
3. Import the config in `src/instrumentation.ts` for early validation
4. Import and use the config within that feature

Example for adding Stripe:

```typescript
// src/lib/stripe/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const stripeConfig = loadConfig({
  server: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  public: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  },
});
```

Then use it in your Stripe client:

```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe";
import { stripeConfig } from "./config";

export const stripe = new Stripe(stripeConfig.server.secretKey);
```
