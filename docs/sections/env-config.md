## Environment Variable Management

Type-safe server and client environment variable validation with clear error messages if variables are missing, invalid, or accessed on the client.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/load-config.json
```

This installs the `load-config.ts` utility:

````typescript
// src/lib/common/load-config.ts
import { z } from "zod";

// =============================================================================
// Types
// =============================================================================

/** Config with feature flag enabled - includes validated config data */
type EnabledConfig<T> = T & { isEnabled: true };

/** Config with feature flag disabled - no config data available */
type DisabledConfig = { isEnabled: false };

/** Optional feature config - either enabled with data or disabled */
export type FeatureConfig<T> = EnabledConfig<T> | DisabledConfig;

/** Env value: string shorthand or full object with schema */
type EnvValue = string | { env: string; schema: z.ZodTypeAny };

/** Infer the output type from an EnvValue */
type InferEnvValue<T> = T extends string
  ? string
  : T extends { schema: infer S }
    ? S extends z.ZodTypeAny
      ? z.infer<S>
      : never
    : never;

/** Infer the full config type from an env record */
type InferEnv<T extends Record<string, EnvValue>> = {
  [K in keyof T]: InferEnvValue<T[K]>;
};

/** Options for loadConfig without a feature flag (required config) */
type LoadConfigOptionsRequired<T extends Record<string, EnvValue>> = {
  name?: string;
  env: T;
};

/** Options for loadConfig with a feature flag (optional config) */
type LoadConfigOptionsOptional<T extends Record<string, EnvValue>> = {
  name?: string;
  flag: string;
  env: T;
};

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when configuration validation fails.
 */
export class InvalidConfigurationError extends Error {
  constructor(message: string, featureName?: string) {
    const feature = featureName ? ` for ${featureName}` : "";
    super(
      `Configuration validation error${feature}! Did you correctly set all required environment variables in .env file?\n - ${message}`,
    );
    this.name = "InvalidConfigurationError";
  }
}

/**
 * Error thrown when server-only config is accessed on the client.
 */
export class ServerConfigClientAccessError extends Error {
  constructor(key: string, envVarName: string) {
    super(
      `Attempted to access server-only config '${key}' (${envVarName}) on client. ` +
        `Use a NEXT_PUBLIC_* env var to expose to client, or ensure this code only runs on server.`,
    );
    this.name = "ServerConfigClientAccessError";
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Checks if a flag env var is set to a truthy value.
 */
function isFlagEnabled(flag: string | undefined): boolean {
  if (!flag) return false;
  return ["true", "1", "yes"].includes(flag.toLowerCase());
}

/**
 * Normalizes an EnvValue to { env, schema } form.
 */
function normalizeEnvValue(value: EnvValue): {
  env: string;
  schema: z.ZodTypeAny;
} {
  return typeof value === "string" ? { env: value, schema: z.string() } : value;
}

/**
 * Creates a Proxy that throws when server-only config is accessed on client.
 */
function createConfigProxy<T extends object>(
  data: T,
  envVarNames: Record<string, string>,
): T {
  // On server, no proxy needed
  if (typeof window === "undefined") {
    return data;
  }

  return new Proxy(data, {
    get(target, prop, receiver) {
      // Allow symbols, isEnabled, and prototype methods
      if (
        typeof prop === "symbol" ||
        prop === "isEnabled" ||
        !(prop in target)
      ) {
        return Reflect.get(target, prop, receiver);
      }

      const envVarName = envVarNames[prop];
      if (envVarName && !envVarName.startsWith("NEXT_PUBLIC_")) {
        throw new ServerConfigClientAccessError(prop, envVarName);
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

// =============================================================================
// loadConfig
// =============================================================================

/**
 * Loads and validates environment configuration with type safety and runtime protection.
 *
 * **Features:**
 * - Type-safe config from env vars with full inference
 * - Optional feature flags for conditional configs
 * - Runtime protection: throws when server-only config accessed on client
 * - Shorthand (string) or full form ({ env, schema }) for each key
 *
 * @example Required config
 * ```ts
 * export const databaseConfig = loadConfig({
 *   env: {
 *     url: 'DATABASE_URL',
 *     poolSize: { env: 'DATABASE_POOL_SIZE', schema: z.coerce.number().default(10) },
 *   },
 * });
 * // Type: { url: string; poolSize: number }
 * ```
 *
 * @example Optional feature config
 * ```ts
 * export const sentryConfig = loadConfig({
 *   name: 'Sentry',
 *   flag: 'ENABLE_SENTRY',
 *   env: {
 *     dsn: 'NEXT_PUBLIC_SENTRY_DSN',
 *     project: 'NEXT_PUBLIC_SENTRY_PROJECT',
 *     token: 'SENTRY_AUTH_TOKEN',
 *   },
 * });
 * // Type: FeatureConfig<{ dsn: string; project: string; token: string }>
 *
 * // Usage
 * if (sentryConfig.isEnabled) {
 *   initSentry(sentryConfig.dsn); // ✓ works (NEXT_PUBLIC_*)
 *   console.log(sentryConfig.token); // ✗ throws on client (server-only)
 * }
 * ```
 */
export function loadConfig<T extends Record<string, EnvValue>>(
  options: LoadConfigOptionsRequired<T>,
): InferEnv<T>;
export function loadConfig<T extends Record<string, EnvValue>>(
  options: LoadConfigOptionsOptional<T>,
): FeatureConfig<InferEnv<T>>;
export function loadConfig<T extends Record<string, EnvValue>>(
  options: LoadConfigOptionsRequired<T> | LoadConfigOptionsOptional<T>,
): InferEnv<T> | FeatureConfig<InferEnv<T>> {
  const { name, env } = options;
  const flag = "flag" in options ? options.flag : undefined;

  // If feature flag provided and not enabled, return disabled
  if (flag !== undefined && !isFlagEnabled(process.env[flag])) {
    return { isEnabled: false };
  }

  // Build config object and track env var names for proxy
  const config: Record<string, unknown> = {};
  const envVarNames: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    const { env: envVarName, schema } = normalizeEnvValue(value);
    envVarNames[key] = envVarName;

    const rawValue = process.env[envVarName];
    const result = schema.safeParse(rawValue);

    if (!result.success) {
      const issue = result.error.issues[0];
      // Generate helpful error message
      const message =
        rawValue === undefined
          ? `${envVarName} must be defined.`
          : `${envVarName} is invalid: ${issue?.message ?? "validation failed"}`;
      throw new InvalidConfigurationError(message, name);
    }

    config[key] = result.data;
  }

  // Wrap with proxy for client-side protection
  const proxiedConfig = createConfigProxy(config, envVarNames);

  // Return with isEnabled if feature flag was provided
  if (flag !== undefined) {
    return Object.assign(proxiedConfig, {
      isEnabled: true as const,
    }) as FeatureConfig<InferEnv<T>>;
  }

  return proxiedConfig as InferEnv<T>;
}
````

---

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

### Optional Environment Variable

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
      dsn: sentryConfig.dsn,
    });
  }
}
```

### Client-Side Environment Variables

`NEXT_PUBLIC_*` env vars are allowed to be accessed on the client. The config object uses a Proxy to protect all other vars from being accessed on the client:

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

For transforms, defaults, or complex validation, pass in a custom Zod schema:

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

### Error Messages

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
