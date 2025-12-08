## Environment Variable Management

Type-safe environment variable validation using Zod with a modular config pattern.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/validate-config.json
```

This installs the `validate-config.ts` utility to `src/lib/common/validate-config.ts`.

---

### Why This Pattern?

- **Type safety**: Catch missing or invalid env vars at startup, not runtime
- **Modular**: Each feature/lib owns its own config
- **Clear error messages**: Know exactly which variable is missing
- **No global config**: Import config directly from the lib that owns it

The goal is twofold: get full TypeScript autocompletion when accessing config values, and surface actionable error messages when configuration is missing or invalid.

When environment variables are missing, you get an error like this:

```
Error [InvalidConfigurationError]: Configuration validation error! Did you correctly set all required environment variables in .env file?
 - BETTER_AUTH_SECRET must be defined. (at path: secret)
 - BETTER_AUTH_URL must be defined. (at path: url)
    at validateConfig (src/lib/common/validate-config.ts:72:11)
    at module evaluation (src/lib/auth/config.ts:16:41)
```

This tells you exactly which variables are missing and where the validation failed, making it easy to fix configuration issues during development or deployment.

### Step 1: Create config utilities

Create `src/lib/common/validate-config.ts` with shared helpers:

````typescript
import { z } from "zod";

/**
 * Makes all properties potentially undefined, with special handling for string enums.
 * Used to type raw config objects before Zod validation since `process.env.*` returns
 * `string | undefined`.
 *
 * @example
 * ```ts
 * type Config = { url: string; port: number; nested: { key: string } };
 * type Raw = PreValidate<Config>;
 * // Result: { url: string | undefined; port: number | undefined; nested: { key: string | undefined } | undefined }
 * ```
 */
export type PreValidate<ConfigData> = {
  [K in keyof ConfigData]: ConfigData[K] extends object
    ? PreValidate<ConfigData[K]> | undefined
    : ConfigData[K] extends string
      ? string | undefined
      : ConfigData[K] | undefined;
};

/**
 * Error thrown when configuration validation fails.
 * Provides detailed error messages listing all missing or invalid environment variables.
 *
 * @example
 * ```
 * Error [InvalidConfigurationError]: Configuration validation error! Did you correctly set all required environment variables in .env file?
 *  - DATABASE_URL must be defined. (at path: url)
 *  - API_KEY must be defined. (at path: apiKey)
 * ```
 */
export class InvalidConfigurationError extends Error {
  constructor(issues: z.ZodError["issues"]) {
    let errorMessage =
      "Configuration validation error! Did you correctly set all required environment variables in .env file?";
    for (const issue of issues) {
      errorMessage = `${errorMessage}\n - ${issue.message} (at path: ${issue.path.join(".")})`;
    }
    super(errorMessage);
    this.name = "InvalidConfigurationError";
  }
}

/**
 * Validates a config object against a Zod schema.
 * Returns the validated and typed config, or throws `InvalidConfigurationError` if validation fails.
 *
 * @param schema - Zod schema defining the expected config shape and validation rules
 * @param config - Raw config object with values from `process.env`
 * @returns Validated config object with full type safety
 * @throws {InvalidConfigurationError} When any required env vars are missing or invalid
 *
 * @example
 * ```ts
 * // Define a schema for your feature's config
 * const DatabaseConfigSchema = z.object({
 *   url: z.string("DATABASE_URL must be defined."),
 *   poolSize: z.coerce.number().default(10),
 * });
 *
 * type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
 *
 * // Create raw config from env vars (PreValidate allows undefined values)
 * const config: PreValidate<DatabaseConfig> = {
 *   url: process.env.DATABASE_URL,
 *   poolSize: process.env.DATABASE_POOL_SIZE,
 * };
 *
 * // Validate and export - throws at startup if DATABASE_URL is missing
 * export const databaseConfig = validateConfig(DatabaseConfigSchema, config);
 *
 * // Now use with full type safety
 * databaseConfig.url;      // string (guaranteed to exist)
 * databaseConfig.poolSize; // number (defaults to 10 if not set)
 * ```
 */
export function validateConfig<T extends z.ZodTypeAny>(
  schema: T,
  config: PreValidate<z.infer<T>>,
): z.infer<T> {
  const result = schema.safeParse(config);
  if (!result.success) {
    throw new InvalidConfigurationError(result.error.issues);
  }
  return result.data;
}
````

### Step 2: Create module-level configs

Each feature lib defines its own config file. For example, `src/lib/db/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const DatabaseConfigSchema = z.object({
  url: z.string("DATABASE_URL must be defined."),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

const config: PreValidate<DatabaseConfig> = {
  url: process.env.DATABASE_URL,
};

export const databaseConfig = validateConfig(DatabaseConfigSchema, config);
```

Similarly for AI config in `src/lib/ai/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const AIConfigSchema = z.object({
  gatewayApiKey: z.string("AI_GATEWAY_API_KEY must be defined."),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

const config: PreValidate<AIConfig> = {
  gatewayApiKey: process.env.AI_GATEWAY_API_KEY,
};

export const aiConfig = validateConfig(AIConfigSchema, config);
```

### Step 3: Use the config

Import config directly from the lib that owns it:

```typescript
// Before
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// After
import { databaseConfig } from "./config";

const pool = new Pool({
  connectionString: databaseConfig.url,
});
```

### Adding New Environment Variables

When adding a new feature that needs env vars:

1. Create `src/lib/<feature>/config.ts` with the Zod schema
2. Import and use it within that feature's lib
3. Access via `<feature>Config.<variable>`

Example for adding Stripe:

```typescript
// src/lib/stripe/config.ts
import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const StripeConfigSchema = z.object({
  secretKey: z.string("STRIPE_SECRET_KEY must be defined."),
  webhookSecret: z.string("STRIPE_WEBHOOK_SECRET must be defined."),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;

const config: PreValidate<StripeConfig> = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};

export const stripeConfig = validateConfig(StripeConfigSchema, config);
```

Then use it in your Stripe client:

```typescript
// src/lib/stripe/client.ts
import Stripe from "stripe";
import { stripeConfig } from "./config";

export const stripe = new Stripe(stripeConfig.secretKey);
```

### Advanced Validation

Zod supports complex validations:

```typescript
const ConfigSchema = z.object({
  // URL validation
  apiUrl: z.url("API_URL must be a valid URL."),

  // String length validation
  encryptionKey: z.string().length(64, "ENCRYPTION_KEY must be 64 characters."),

  // Optional with default
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),

  // Transform string to number
  port: z.coerce.number().default(3000),
});
```
