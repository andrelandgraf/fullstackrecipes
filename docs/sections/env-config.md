## Environment Variable Management

Type-safe environment variable validation with runtime protection for server-only config.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/load-config.json
```

This installs the `load-config.ts` utility to `src/lib/common/load-config.ts`.

---

### Why This Pattern?

- **Type safety**: Full TypeScript inference from env var definitions
- **Single source of truth**: Define env var name once, get validation + error messages
- **Runtime protection**: Server-only config throws helpful errors when accessed on client
- **Modular**: Each feature/lib owns its own config
- **Clear error messages**: Know exactly which variable is missing

When environment variables are missing, you get an error like this:

```
Error [InvalidConfigurationError]: Configuration validation error for Sentry!
Did you correctly set all required environment variables in .env file?
 - SENTRY_AUTH_TOKEN must be defined.
```

When server-only config is accessed on the client:

```
Error [ServerConfigClientAccessError]: Attempted to access server-only config 'token' (SENTRY_AUTH_TOKEN) on client.
Use a NEXT_PUBLIC_* env var to expose to client, or ensure this code only runs on server.
```

### Basic Usage

Each feature lib defines its own config file:

```typescript
// src/lib/db/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  env: {
    url: "DATABASE_URL",
  },
});
// Type: { url: string }
```

Then import and use it:

```typescript
import { databaseConfig } from "./config";

const pool = new Pool({
  connectionString: databaseConfig.url,
});
```

### Optional Feature Configs

Use the `flag` parameter for features that can be enabled/disabled:

```typescript
// src/lib/sentry/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const sentryConfig = loadConfig({
  name: "Sentry",
  flag: "ENABLE_SENTRY",
  env: {
    dsn: "NEXT_PUBLIC_SENTRY_DSN",
    project: "NEXT_PUBLIC_SENTRY_PROJECT",
    org: "NEXT_PUBLIC_SENTRY_ORG",
    token: "SENTRY_AUTH_TOKEN",
  },
});
// Type: FeatureConfig<{ dsn: string; project: string; org: string; token: string }>
```

Behavior:

- `ENABLE_SENTRY` not set → `{ isEnabled: false }` (no validation, no errors)
- `ENABLE_SENTRY="true"` → validates all env vars, returns `{ ..., isEnabled: true }`
- `ENABLE_SENTRY="true"` + missing env → throws `InvalidConfigurationError`

Usage:

```typescript
// src/instrumentation.ts
import { sentryConfig } from "./lib/sentry/config";

export async function register() {
  if (sentryConfig.isEnabled) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: sentryConfig.dsn, // ✓ NEXT_PUBLIC_* works on client
    });
  }
}
```

### Runtime Protection for Server-Only Config

The config object uses a Proxy to protect server-only env vars from being accessed on the client:

```typescript
// On the server - everything works
sentryConfig.dsn; // ✓ "https://..."
sentryConfig.token; // ✓ "secret-token"

// On the client
sentryConfig.dsn; // ✓ works (NEXT_PUBLIC_*)
sentryConfig.token; // ✗ throws ServerConfigClientAccessError
```

This catches accidental client-side access to secrets at runtime with a helpful error message.

### Advanced Validation

For transforms, defaults, or complex validation, use the full form with a Zod schema:

```typescript
import { z } from "zod";
import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  env: {
    url: "DATABASE_URL",
    // Transform string to number with default
    poolSize: {
      env: "DATABASE_POOL_SIZE",
      schema: z.coerce.number().default(10),
    },
  },
});
// Type: { url: string; poolSize: number }
```

More examples:

```typescript
export const config = loadConfig({
  env: {
    // Required string (shorthand)
    apiKey: "API_KEY",

    // Optional string
    debugMode: { env: "DEBUG_MODE", schema: z.string().optional() },

    // String with regex validation
    fromEmail: {
      env: "FROM_EMAIL",
      schema: z
        .string()
        .regex(/^.+\s<.+@.+\..+>$/, 'Must match "Name <email>" format'),
    },

    // Enum with default
    nodeEnv: {
      env: "NODE_ENV",
      schema: z
        .enum(["development", "production", "test"])
        .default("development"),
    },

    // Boolean
    enableFeature: {
      env: "ENABLE_FEATURE",
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
2. Use `loadConfig` with the env var mappings
3. Import the config in `src/instrumentation.ts` for early validation
4. Import and use the config within that feature

Example for adding Stripe:

```typescript
// src/lib/stripe/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const stripeConfig = loadConfig({
  env: {
    secretKey: "STRIPE_SECRET_KEY",
    webhookSecret: "STRIPE_WEBHOOK_SECRET",
    publicKey: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  },
});
```

Then use it in your Stripe client:

```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe";
import { stripeConfig } from "./config";

export const stripe = new Stripe(stripeConfig.secretKey);
```

### API Reference

```typescript
function loadConfig(options: {
  /** Optional name for error messages (e.g., "Sentry") */
  name?: string;
  /** Env var name for feature flag (e.g., "ENABLE_SENTRY") */
  flag?: string;
  /** Map of config keys to env var definitions */
  env: Record<string, string | { env: string; schema: z.ZodTypeAny }>;
}): Config | FeatureConfig<Config>;
```

**Env value formats:**

- `string` - Env var name, validates as required string
- `{ env: string; schema: ZodSchema }` - Full form with custom Zod schema

**Return types:**

- Without `flag`: `{ [key]: value }` - Plain config object
- With `flag`: `{ isEnabled: true; ... } | { isEnabled: false }` - Discriminated union

### Syncing with Vercel (Optional)

Use the Vercel CLI to sync environment variables between your local development environment and your Vercel deployment.

#### Pull environment variables from Vercel

Download environment variables from your Vercel project to a local file:

```bash
# Pull development environment variables to .env.local
vercel env pull

# Pull to a specific file
vercel env pull .env.local

# Pull preview environment variables
vercel env pull --environment=preview
```

#### Push environment variables to Vercel

Add environment variables to your Vercel project from the command line:

```bash
# Add interactively (prompts for value)
vercel env add MY_VAR

# Add to a specific environment
vercel env add MY_VAR production
```

#### List and remove environment variables

```bash
# List all environment variables
vercel env ls

# List for a specific environment
vercel env ls production

# Remove an environment variable
vercel env rm MY_VAR production
```

#### Workflow

After updating environment variables in the Vercel dashboard or via CLI, pull them locally:

```bash
vercel env pull .env.local
```

This keeps your local `.env.local` in sync with your deployment.
