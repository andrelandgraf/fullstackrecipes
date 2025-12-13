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

/**
 * Conditional optional: this var is optional if the specified env var(s) are set.
 * - `true` - always optional
 * - `false` | `undefined` - required
 * - `'OTHER_VAR'` - optional if OTHER_VAR is set
 * - `['VAR_A', 'VAR_B']` - optional if any of the listed vars are set
 */
type ConditionalOptional = boolean | string | string[];

/** Full env value object with all options */
type EnvValueFull = {
  env: string;
  schema?: z.ZodTypeAny;
  optional?: ConditionalOptional;
};

/** Env value: string shorthand or full object with schema and optional */
type EnvValue = string | EnvValueFull;

/** Infer the output type from an EnvValue */
type InferEnvValue<T> = T extends string
  ? string
  : T extends { optional: true }
    ? T extends { schema: infer S }
      ? S extends z.ZodTypeAny
        ? z.infer<S> | undefined
        : string | undefined
      : string | undefined
    : T extends { optional: string | string[] }
      ? T extends { schema: infer S }
        ? S extends z.ZodTypeAny
          ? z.infer<S> | undefined
          : string | undefined
        : string | undefined
      : T extends { schema: infer S }
        ? S extends z.ZodTypeAny
          ? z.infer<S>
          : never
        : string;

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
 * Normalizes an EnvValue to full form with env, schema, and optional.
 */
function normalizeEnvValue(value: EnvValue): {
  env: string;
  schema: z.ZodTypeAny;
  optional: ConditionalOptional | undefined;
} {
  if (typeof value === "string") {
    return { env: value, schema: z.string(), optional: undefined };
  }
  return {
    env: value.env,
    schema: value.schema ?? z.string(),
    optional: value.optional,
  };
}

/**
 * Checks if a conditional optional is satisfied (i.e., the var can be skipped).
 * Returns true if the variable is optional and may be missing.
 */
function isOptionalSatisfied(
  optional: ConditionalOptional | undefined,
): boolean {
  if (optional === undefined || optional === false) {
    return false; // required
  }
  if (optional === true) {
    return true; // always optional
  }
  // Check if any of the fallback env vars are set
  const fallbacks = Array.isArray(optional) ? optional : [optional];
  return fallbacks.some((envVar) => {
    const value = process.env[envVar];
    return value !== undefined && value !== "";
  });
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
    const { env: envVarName, schema, optional } = normalizeEnvValue(value);
    envVarNames[key] = envVarName;

    const rawValue = process.env[envVarName];

    // Check if this var can be skipped (optional or fallback exists)
    if (rawValue === undefined && isOptionalSatisfied(optional)) {
      config[key] = undefined;
      continue;
    }

    const result = schema.safeParse(rawValue);

    if (!result.success) {
      const issue = result.error.issues[0];
      // Generate helpful error message
      let message: string;
      if (rawValue === undefined) {
        // Include fallback info in error message for conditional optionals
        if (typeof optional === "string") {
          message = `Either ${envVarName} or ${optional} must be defined.`;
        } else if (Array.isArray(optional) && optional.length > 0) {
          message = `Either ${envVarName} or one of [${optional.join(", ")}] must be defined.`;
        } else {
          message = `${envVarName} must be defined.`;
        }
      } else {
        message = `${envVarName} is invalid: ${issue?.message ?? "validation failed"}`;
      }
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

If `DATABASE_URL` is missing, you get a clear error:

```
Error [InvalidConfigurationError]: Configuration validation error!
Did you correctly set all required environment variables in .env file?
 - DATABASE_URL must be defined.
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

### Either-Or Environment Variables

Use the `optional` parameter to create conditional dependencies between env vars. This is useful when a feature can be configured with alternative credentials.

```typescript
// src/lib/ai/config.ts
import { loadConfig } from "@/lib/common/load-config";

export const aiConfig = loadConfig({
  name: "AI Gateway",
  flag: "ENABLE_AI_GATEWAY",
  env: {
    // Either VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY must be set
    oidcToken: { env: "VERCEL_OIDC_TOKEN", optional: "AI_GATEWAY_API_KEY" },
    apiKey: { env: "AI_GATEWAY_API_KEY", optional: "VERCEL_OIDC_TOKEN" },
  },
});
// Type: FeatureConfig<{ oidcToken?: string; apiKey?: string }>
```

The `optional` parameter accepts:

| Value                  | Behavior                                   |
| ---------------------- | ------------------------------------------ |
| `undefined` or `false` | Required (default)                         |
| `true`                 | Optional                                   |
| `'OTHER_VAR'`          | Optional if `OTHER_VAR` is set             |
| `['VAR_A', 'VAR_B']`   | Optional if any of the listed vars are set |

Error messages include the alternative:

```
Error [InvalidConfigurationError]: Configuration validation error for AI Gateway!
Did you correctly set all required environment variables in .env file?
 - Either VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY must be defined.
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

This catches accidental client-side access to secrets at runtime:

```
Error [ServerConfigClientAccessError]: Attempted to access server-only config 'token' (SENTRY_AUTH_TOKEN) on client.
Use a NEXT_PUBLIC_* env var to expose to client, or ensure this code only runs on server.
```

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
