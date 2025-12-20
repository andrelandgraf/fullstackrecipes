### Type-Safe Environment Variable Validation

Instead of accessing environment variables directly in code, we use a `config-schema` utility to validate environment variables.

{% registry items="config-schema" /%}

#### Basic Usage

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
 - server.url (DATABASE_URL) must be defined.
```

Then import and use it:

```typescript
// src/lib/db/client.ts
import { databaseConfig } from "./config";

const pool = new Pool({
  connectionString: databaseConfig.server.url,
});
```

#### Server vs Public Fields

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

#### Feature Flags

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

> **Enforced:** If your config has public fields, the flag must use a `NEXT_PUBLIC_*` variable. This is validated at definition time and throws an error if violated:
>
> ```
> Error [InvalidConfigurationError]: Configuration validation error for Sentry!
> Did you correctly set all required environment variables in your .env* file?
>  - Flag "ENABLE_SENTRY" must use a NEXT_PUBLIC_* variable when config has public fields. Otherwise, isEnabled will always be false on the client.
> ```
>
> This prevents a common bug where the flag is `undefined` on the client (since non-public env vars aren't inlined), causing `isEnabled` to always be `false` in client code even when the feature is enabled on the server.

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

#### Either-Or Values

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
 - Either server.oidcToken (VERCEL_OIDC_TOKEN) or server.gatewayApiKey (AI_GATEWAY_API_KEY) must be defined.
```

#### Combining Flag and Constraints

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

#### Optional Fields

Use `optional: true` for fields that are always optional:

```typescript
export const authConfig = configSchema("Auth", {
  secret: server({ env: "BETTER_AUTH_SECRET" }),
  url: server({ env: "BETTER_AUTH_URL" }),
  vercelClientId: server({ env: "VERCEL_CLIENT_ID", optional: true }),
  vercelClientSecret: server({ env: "VERCEL_CLIENT_SECRET", optional: true }),
});
```

#### Client-Side Protection

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
Error [ServerConfigClientAccessError]: [Sentry] Attempted to access server-only config 'server.token' (SENTRY_AUTH_TOKEN) on client.
Move this value to 'public' if it needs client access, or ensure this code only runs on server.
```

#### Custom Validation

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

---

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
