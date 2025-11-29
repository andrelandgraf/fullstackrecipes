## Environment Variable Management

Type-safe environment variable validation using Zod with a modular config pattern.

### Why This Pattern?

- **Type safety**: Catch missing or invalid env vars at startup, not runtime
- **Modular**: Each feature/lib owns its own config
- **Centralized access**: One import for all server-side config
- **Clear error messages**: Know exactly which variable is missing

### Step 1: Create config utilities

Create `src/lib/config/utils.ts` with shared helpers:

```typescript
import { z } from "zod";

/**
 * PreValidate is similar to Partial but with special handling for string enums.
 * Used to type the raw config object before Zod validation.
 */
export type PreValidate<ConfigData> = {
  [K in keyof ConfigData]: ConfigData[K] extends object
    ? PreValidate<ConfigData[K]> | undefined
    : ConfigData[K] extends string
      ? string | undefined
      : ConfigData[K] | undefined;
};

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
 * Throws InvalidConfigurationError if validation fails.
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
```

### Step 2: Create module-level configs

Each feature lib defines its own config file. For example, `src/lib/db/config.ts`:

```typescript
import { z } from "zod";
import { validateConfig, type PreValidate } from "../config/utils";

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
import { validateConfig, type PreValidate } from "../config/utils";

const AIConfigSchema = z.object({
  gatewayApiKey: z.string("AI_GATEWAY_API_KEY must be defined."),
});

export type AIConfig = z.infer<typeof AIConfigSchema>;

const config: PreValidate<AIConfig> = {
  gatewayApiKey: process.env.AI_GATEWAY_API_KEY,
};

export const aiConfig = validateConfig(AIConfigSchema, config);
```

### Step 3: Create the central server config

Aggregate all module configs in `src/lib/config/server.ts`:

```typescript
import { databaseConfig } from "../db/config";
import { aiConfig } from "../ai/config";

export const serverConfig = {
  database: databaseConfig,
  ai: aiConfig,
} as const;

export type ServerConfig = typeof serverConfig;
```

### Step 4: Use the config

Replace all `process.env.*` references with `serverConfig`:

```typescript
// Before
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// After
import { serverConfig } from "../config/server";

const pool = new Pool({
  connectionString: serverConfig.database.url,
});
```

### Adding New Environment Variables

When adding a new feature that needs env vars:

1. Create `src/lib/<feature>/config.ts` with the Zod schema
2. Import and add it to `src/lib/config/server.ts`
3. Access via `serverConfig.<feature>.<variable>`

Example for adding Stripe:

```typescript
// src/lib/stripe/config.ts
import { z } from "zod";
import { validateConfig, type PreValidate } from "../config/utils";

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

Then update `src/lib/config/server.ts`:

```typescript
import { databaseConfig } from "../db/config";
import { aiConfig } from "../ai/config";
import { stripeConfig } from "../stripe/config";

export const serverConfig = {
  database: databaseConfig,
  ai: aiConfig,
  stripe: stripeConfig,
} as const;
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

---

## References

- [Zod Documentation](https://zod.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
