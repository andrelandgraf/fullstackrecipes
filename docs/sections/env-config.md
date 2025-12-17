## Environment Variable Management

Comprehensive environment variable managemet including syncing variables with Vercel, validating them prebuild and during development, and a Drizzle-like schema API for type-safe environment variable validation of server and client variables with clear error messages if variables are missing, invalid, or accessed on the client.

---

### Type-Safe Environment Variable Validation

Instead of accessing environment variables directly in code, we use a `config-schema` utility to validate environment variables.

Create `config-schema.ts`:

````typescript
// src/lib/config/schema.ts
import { z } from "zod";

// =============================================================================
// Types
// =============================================================================

/** Base field definition with schema type */
type FieldDefBase<TSchema extends z.ZodTypeAny = z.ZodString> = {
  env: string;
  value: string | undefined;
  schema: TSchema;
  isOptional: boolean;
};

/** Server field definition */
type ServerFieldDef<TSchema extends z.ZodTypeAny = z.ZodString> =
  FieldDefBase<TSchema> & { _type: "server" };

/** Public field definition */
type PublicFieldDef<TSchema extends z.ZodTypeAny = z.ZodString> =
  FieldDefBase<TSchema> & { _type: "public" };

/** Field definition union */
type FieldDef = ServerFieldDef<z.ZodTypeAny> | PublicFieldDef<z.ZodTypeAny>;

/** Schema fields record */
type SchemaFields = Record<string, FieldDef>;

/** Constraint result */
type ConstraintResult<T extends SchemaFields> = {
  type: "oneOf";
  fields: (keyof T)[];
  satisfied: boolean;
};

/** Constraint function */
type Constraint<T extends SchemaFields> = (fields: T) => ConstraintResult<T>;

/** Infer the output type from a FieldDef based on schema and optionality */
type InferField<F> =
  F extends FieldDefBase<infer S>
    ? F["isOptional"] extends true
      ? z.infer<S> | undefined
      : z.infer<S>
    : never;

/** Extract server field keys */
type ServerKeys<T extends SchemaFields> = {
  [K in keyof T]: T[K] extends ServerFieldDef<z.ZodTypeAny> ? K : never;
}[keyof T];

/** Extract public field keys */
type PublicKeys<T extends SchemaFields> = {
  [K in keyof T]: T[K] extends PublicFieldDef<z.ZodTypeAny> ? K : never;
}[keyof T];

/** Build server section type */
type ServerSection<T extends SchemaFields> = {
  [K in ServerKeys<T>]: InferField<T[K]>;
};

/** Build public section type */
type PublicSection<T extends SchemaFields> = {
  [K in PublicKeys<T>]: InferField<T[K]>;
};

/** Check if there are any server fields */
type HasServerFields<T extends SchemaFields> =
  ServerKeys<T> extends never ? false : true;

/** Check if there are any public fields */
type HasPublicFields<T extends SchemaFields> =
  PublicKeys<T> extends never ? false : true;

/** Infer config result from fields (no isEnabled) */
type InferConfigResult<T extends SchemaFields> =
  (HasServerFields<T> extends true ? { server: ServerSection<T> } : object) &
    (HasPublicFields<T> extends true ? { public: PublicSection<T> } : object);

/** Config with feature flag enabled */
type EnabledConfig<T extends SchemaFields> = InferConfigResult<T> & {
  isEnabled: true;
};

/** Config with feature flag disabled */
type DisabledConfig = { isEnabled: false };

/** Feature config (when flag is used) */
export type FeatureConfig<T extends SchemaFields> =
  | EnabledConfig<T>
  | DisabledConfig;

/** Flag options */
type FlagOptions = {
  env: string;
  value: string | undefined;
};

/** Options object with flag (returns FeatureConfig) */
type ConfigOptionsWithFlag<T extends SchemaFields> = {
  flag: FlagOptions;
  constraints?: (schema: T) => Constraint<T>[];
};

/** Options object without flag (returns InferConfigResult) */
type ConfigOptionsWithoutFlag<T extends SchemaFields> = {
  flag?: undefined;
  constraints: (schema: T) => Constraint<T>[];
};

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when configuration validation fails.
 */
export class InvalidConfigurationError extends Error {
  constructor(message: string, schemaName?: string) {
    const schema = schemaName ? ` for ${schemaName}` : "";
    super(
      `Configuration validation error${schema}! Did you correctly set all required environment variables in your .env* file?\n - ${message}`,
    );
    this.name = "InvalidConfigurationError";
  }
}

/**
 * Error thrown when server-only config is accessed on the client.
 */
export class ServerConfigClientAccessError extends Error {
  constructor(key: string) {
    super(
      `Attempted to access server-only config 'server.${key}' on client. ` +
        `Move this value to 'public' if it needs client access, or ensure this code only runs on server.`,
    );
    this.name = "ServerConfigClientAccessError";
  }
}

// =============================================================================
// Field Builders
// =============================================================================

type ServerFieldOptionsBase = {
  env: string;
  value?: string | undefined;
  optional?: boolean;
};

type ServerFieldOptionsWithSchema<T extends z.ZodTypeAny> =
  ServerFieldOptionsBase & {
    schema: T;
  };

type ServerFieldOptionsWithoutSchema = ServerFieldOptionsBase & {
  schema?: undefined;
};

type PublicFieldOptionsBase = {
  env: string;
  value: string | undefined; // Required for public fields (Next.js inlining)
  optional?: boolean;
};

type PublicFieldOptionsWithSchema<T extends z.ZodTypeAny> =
  PublicFieldOptionsBase & {
    schema: T;
  };

type PublicFieldOptionsWithoutSchema = PublicFieldOptionsBase & {
  schema?: undefined;
};

/**
 * Define a server-only config field.
 * Server fields are only accessible on the server and throw on client access.
 *
 * @example
 * ```ts
 * server({ env: "DATABASE_URL" })
 * server({ env: "PORT", schema: z.coerce.number().default(3000) })
 * server({ env: "OPTIONAL_KEY", optional: true })
 * ```
 */
export function server<T extends z.ZodTypeAny>(
  options: ServerFieldOptionsWithSchema<T>,
): ServerFieldDef<T>;
export function server(
  options: ServerFieldOptionsWithoutSchema,
): ServerFieldDef<z.ZodString>;
export function server(
  options: ServerFieldOptionsBase & { schema?: z.ZodTypeAny },
): ServerFieldDef<z.ZodTypeAny> {
  const { env, value, schema = z.string(), optional = false } = options;

  return {
    _type: "server" as const,
    env,
    value: value ?? process.env[env],
    schema,
    isOptional: optional,
  };
}

/**
 * Define a public config field (accessible on both server and client).
 * The value must be passed directly for Next.js to inline NEXT_PUBLIC_* variables.
 *
 * @example
 * ```ts
 * pub({ env: "NEXT_PUBLIC_DSN", value: process.env.NEXT_PUBLIC_DSN })
 * pub({ env: "NEXT_PUBLIC_ENABLED", value: process.env.NEXT_PUBLIC_ENABLED, schema: z.string().optional() })
 * ```
 */
export function pub<T extends z.ZodTypeAny>(
  options: PublicFieldOptionsWithSchema<T>,
): PublicFieldDef<T>;
export function pub(
  options: PublicFieldOptionsWithoutSchema,
): PublicFieldDef<z.ZodString>;
export function pub(
  options: PublicFieldOptionsBase & { schema?: z.ZodTypeAny },
): PublicFieldDef<z.ZodTypeAny> {
  const { env, value, schema = z.string(), optional = false } = options;

  return {
    _type: "public" as const,
    env,
    value,
    schema,
    isOptional: optional,
  };
}

// =============================================================================
// Constraints
// =============================================================================

/**
 * Create a "one of" constraint.
 * At least one of the specified fields must have a value.
 *
 * @example
 * ```ts
 * configSchema("AI", {
 *   oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
 *   apiKey: server({ env: "API_KEY" }),
 * }, {
 *   constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
 * })
 * ```
 */
export function oneOf<T extends SchemaFields>(
  fieldDefs: FieldDef[],
): Constraint<T> {
  return (allFields) => {
    // Find which field names match the provided field defs
    const fieldNames: (keyof T)[] = [];
    for (const [name, field] of Object.entries(allFields)) {
      if (fieldDefs.includes(field)) {
        fieldNames.push(name as keyof T);
      }
    }

    const satisfied = fieldDefs.some(
      (field) => field.value !== undefined && field.value !== "",
    );

    return {
      type: "oneOf",
      fields: fieldNames,
      satisfied,
    };
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Checks if a flag value is truthy.
 */
function isFlagEnabled(flag: string | undefined): boolean {
  if (!flag) return false;
  return ["true", "1", "yes"].includes(flag.toLowerCase());
}

/**
 * Creates a Proxy that throws when server config is accessed on client.
 */
function createServerProxy<T extends object>(data: T): T {
  if (typeof window === "undefined") {
    return data;
  }

  return new Proxy(data, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      throw new ServerConfigClientAccessError(String(prop));
    },
  });
}

// =============================================================================
// Schema Builder
// =============================================================================

// Overload 1: No options (just name and fields)
export function configSchema<T extends SchemaFields>(
  name: string,
  fields: T,
): InferConfigResult<T>;

// Overload 2: With flag option (returns FeatureConfig)
export function configSchema<T extends SchemaFields>(
  name: string,
  fields: T,
  options: ConfigOptionsWithFlag<T>,
): FeatureConfig<T>;

// Overload 3: With constraints but no flag (returns InferConfigResult)
export function configSchema<T extends SchemaFields>(
  name: string,
  fields: T,
  options: ConfigOptionsWithoutFlag<T>,
): InferConfigResult<T>;

/**
 * Define a configuration schema with typed server and public fields.
 *
 * @example Basic server-only config
 * ```ts
 * const dbConfig = configSchema("Database", {
 *   url: server({ env: "DATABASE_URL" }),
 * });
 * // Type: { server: { url: string } }
 * dbConfig.server.url
 * ```
 *
 * @example Feature flag
 * ```ts
 * const sentryConfig = configSchema("Sentry", {
 *   token: server({ env: "SENTRY_AUTH_TOKEN" }),
 *   dsn: pub({ env: "NEXT_PUBLIC_SENTRY_DSN", value: process.env.NEXT_PUBLIC_SENTRY_DSN }),
 * }, {
 *   flag: { env: "NEXT_PUBLIC_ENABLE_SENTRY", value: process.env.NEXT_PUBLIC_ENABLE_SENTRY },
 * });
 *
 * if (sentryConfig.isEnabled) {
 *   sentryConfig.server.token;  // string
 *   sentryConfig.public.dsn;    // string
 * }
 * ```
 *
 * @example Either-or with oneOf (no flag)
 * ```ts
 * const aiConfig = configSchema("AI", {
 *   oidcToken: server({ env: "VERCEL_OIDC_TOKEN" }),
 *   apiKey: server({ env: "API_KEY" }),
 * }, {
 *   constraints: (s) => [oneOf([s.oidcToken, s.apiKey])],
 * });
 * // Type: { server: { oidcToken?: string; apiKey?: string } }
 * ```
 *
 * @example Flag + constraints
 * ```ts
 * const config = configSchema("MyFeature", {
 *   token: server({ env: "TOKEN" }),
 *   backupToken: server({ env: "BACKUP_TOKEN" }),
 * }, {
 *   flag: { env: "ENABLE_FEATURE", value: process.env.ENABLE_FEATURE },
 *   constraints: (s) => [oneOf([s.token, s.backupToken])],
 * });
 * ```
 */
export function configSchema<T extends SchemaFields>(
  name: string,
  fields: T,
  options?: ConfigOptionsWithFlag<T> | ConfigOptionsWithoutFlag<T>,
): InferConfigResult<T> | FeatureConfig<T> {
  const flagOptions = options?.flag;
  const constraintsFn = options?.constraints;
  const hasFlag = flagOptions !== undefined;

  // Check if config has public fields
  const hasPublicFields = Object.values(fields).some(
    (f) => f._type === "public",
  );

  // Enforce: if config has public fields and a flag, flag must be NEXT_PUBLIC_*
  if (hasFlag && hasPublicFields) {
    const flagEnv = flagOptions.env;
    if (!flagEnv.startsWith("NEXT_PUBLIC_")) {
      throw new InvalidConfigurationError(
        `Flag "${flagEnv}" must use a NEXT_PUBLIC_* variable when config has public fields. ` +
          `Otherwise, isEnabled will always be false on the client.`,
        name,
      );
    }
  }

  // If flag exists and is disabled, return early
  if (hasFlag && !isFlagEnabled(flagOptions.value)) {
    return { isEnabled: false };
  }

  // Evaluate constraints if provided
  const constraintList = constraintsFn ? constraintsFn(fields) : [];
  const constraintResults = constraintList.map((c) => c(fields));

  // Collect oneOf constraint results
  const oneOfResults = constraintResults.filter(
    (r): r is ConstraintResult<T> => r.type === "oneOf",
  );

  // Track which fields are covered by oneOf (making them conditionally optional)
  const oneOfFieldNames = new Set<string>();

  for (const result of oneOfResults) {
    for (const fieldName of result.fields) {
      oneOfFieldNames.add(fieldName as string);
    }
  }

  const isClient = typeof window !== "undefined";

  // Process fields
  const serverFields: Record<string, unknown> = {};
  const publicFields: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(fields)) {
    // Skip server validation on client
    if (field._type === "server" && isClient) {
      continue;
    }

    const { value, schema, isOptional } = field;

    // Check if this field is covered by a oneOf constraint
    const isInOneOf = oneOfFieldNames.has(key);
    let canSkipValidation = isOptional;

    if (isInOneOf && value === undefined) {
      // Check if any oneOf constraint covering this field is satisfied
      const relevantOneOf = oneOfResults.find((r) =>
        r.fields.includes(key as keyof T),
      );
      if (relevantOneOf?.satisfied) {
        canSkipValidation = true;
      }
    }

    // Skip validation for optional fields with undefined value
    if (value === undefined && canSkipValidation) {
      if (field._type === "server") {
        serverFields[key] = undefined;
      } else {
        publicFields[key] = undefined;
      }
      continue;
    }

    // Validate
    const parseResult = schema.safeParse(value);

    if (!parseResult.success) {
      const section = field._type;
      const issue = parseResult.error.issues[0];
      let message: string;

      if (value === undefined) {
        // Check if part of oneOf
        if (isInOneOf) {
          const relevantOneOf = oneOfResults.find((r) =>
            r.fields.includes(key as keyof T),
          );
          if (relevantOneOf) {
            const otherFields = relevantOneOf.fields
              .filter((f) => f !== key)
              .map((f) => {
                const otherField = fields[f as string];
                return `${section}.${String(f)} (${otherField.env})`;
              });
            if (otherFields.length === 1) {
              message = `Either ${section}.${key} (${field.env}) or ${otherFields[0]} must be defined.`;
            } else {
              message = `Either ${section}.${key} (${field.env}) or one of [${otherFields.join(", ")}] must be defined.`;
            }
          } else {
            message = `${section}.${key} (${field.env}) must be defined.`;
          }
        } else {
          message = `${section}.${key} (${field.env}) must be defined.`;
        }
      } else {
        message = `${section}.${key} (${field.env}) is invalid: ${issue?.message ?? "validation failed"}`;
      }

      throw new InvalidConfigurationError(message, name);
    }

    if (field._type === "server") {
      serverFields[key] = parseResult.data;
    } else {
      publicFields[key] = parseResult.data;
    }
  }

  // Build result
  const result: Record<string, unknown> = {};

  const hasServer = Object.values(fields).some((f) => f._type === "server");
  const hasPublic = Object.values(fields).some((f) => f._type === "public");

  if (hasServer) {
    result.server = createServerProxy(serverFields);
  }

  if (hasPublic) {
    result.public = publicFields;
  }

  // Return with isEnabled only if flag was provided
  if (hasFlag) {
    return { ...result, isEnabled: true } as FeatureConfig<T>;
  }

  return result as InferConfigResult<T>;
}
````

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
Error [ServerConfigClientAccessError]: Attempted to access server-only config 'server.token' on client.
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

### Managing Environment Variables with Vercel and Next.js

#### Environments

Vercel provides three default environments: development, preview, and production (more [here](https://vercel.com/docs/deployments/environments)).

#### Next.js Load Order

Next.js loads environment variables in the following order, stopping once each variable is found:

1. `process.env`
2. `.env.$(NODE_ENV).local`
3. `.env.local` (not checked when `NODE_ENV` is `test`)
4. `.env.$(NODE_ENV)`
5. `.env`

For example, if `NODE_ENV` is `development` and you define a variable in both `.env.development` and `..env.local`, the value in `.env.local` will be used.

> **Note**: The allowed values for `NODE_ENV` are `production`, `development`, and `test`.

Note `next build` and `next start` will use the production environment variables while `next dev` will use the development environment variables.

#### Local Development

Create a `.env.development` file for development environment variables synced from Vercel and a `.env.local` file for local development overrides.

- Use `.env.development` for development environment variables synced from Vercel.
- Override specific variables in `.env.local` for local development.
- Sync `.env.production` with Vercel to build your project locally with `next build`.

#### Syncing with Vercel

Use the Vercel CLI to keep environment variables in sync.

We write to `.env.development` (not `.env.local`) so that local overrides in `.env.local` aren't deleted when pulling from Vercel.

Add these helper scripts to your `package.json`:

```json
{
  "scripts": {
    "env:pull": "vercel env pull .env.development --environment=development",
    "env:push": "vercel env push .env.development --environment=development",
    "env:pull:prod": "vercel env pull .env.production --environment=production",
    "env:push:prod": "vercel env push .env.production --environment=production"
  }
}
```

| Script          | Purpose                                                          |
| --------------- | ---------------------------------------------------------------- |
| `env:pull`      | Download environment variables from Vercel to `.env.development` |
| `env:push`      | Upload `.env.development` to Vercel                              |
| `env:pull:prod` | Download environment variables from Vercel to `.env.production`  |
| `env:push:prod` | Upload `.env.production` to Vercel                               |

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

### Validating Environment Files Pre-Build

Create a `scripts/validate-env.ts` script to validate all configs against your `.env` files before deploying or during CI:

```typescript
// scripts/validate-env.ts
#!/usr/bin/env bun
/**
 * Validate environment configuration
 *
 * Usage:
 *   bun run validate-env
 *   bun run validate-env --environment=development
 *   bun run validate-env --environment=production
 *
 * This script:
 * 1. Loads env files using Next.js's loadEnvConfig
 * 2. Finds all config.ts files in src/lib/\*\/
 * 3. Validates each config by importing it (triggers configSchema validation)
 * 4. Warns about env variables in .env files that aren't used by any config
 */

import { loadEnvConfig } from "@next/env";
import { Glob } from "bun";
import path from "path";

// ANSI colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

// Parse CLI args
function parseArgs(): { environment?: string } {
  const args = process.argv.slice(2);
  const result: { environment?: string } = {};

  for (const arg of args) {
    if (arg.startsWith("--environment=")) {
      result.environment = arg.split("=")[1];
    }
  }

  return result;
}

// Track which env vars are referenced by configs
const referencedEnvVars = new Set<string>();

// Patch process.env to track access
function trackEnvAccess() {
  const originalEnv = process.env;
  const handler: ProxyHandler<NodeJS.ProcessEnv> = {
    get(target, prop) {
      if (typeof prop === "string" && !prop.startsWith("_")) {
        referencedEnvVars.add(prop);
      }
      return Reflect.get(target, prop);
    },
  };
  process.env = new Proxy(originalEnv, handler);
}

async function main() {
  const args = parseArgs();
  const projectDir = process.cwd();

  console.log(bold("\n🔍 Environment Configuration Validator\n"));

  // Set NODE_ENV if environment specified
  const environment = args.environment ?? process.env.NODE_ENV ?? "development";
  (process.env as Record<string, string>).NODE_ENV = environment;
  console.log(dim(`  Environment: ${environment}\n`));

  // Load env files
  // Second param `dev` tells loadEnvConfig to load .env.development files
  const isDev = environment === "development";
  console.log(dim("  Loading environment files..."));

  const loadedEnvFiles: string[] = [];
  const { combinedEnv, loadedEnvFiles: files } = loadEnvConfig(
    projectDir,
    isDev,
  );

  for (const file of files) {
    loadedEnvFiles.push(file.path);
    console.log(dim(`    ✓ ${path.relative(projectDir, file.path)}`));
  }

  if (loadedEnvFiles.length === 0) {
    console.log(dim("    No .env files found"));
  }

  console.log("");

  // Start tracking env access before importing configs
  trackEnvAccess();

  // Find all config.ts files
  const configGlob = new Glob("src/lib/*/config.ts");
  const configFiles: string[] = [];

  for await (const file of configGlob.scan(projectDir)) {
    configFiles.push(file);
  }

  if (configFiles.length === 0) {
    console.log(yellow("  ⚠ No config.ts files found in src/lib/*/\n"));
    process.exit(0);
  }

  console.log(dim(`  Found ${configFiles.length} config files:\n`));

  // Validate each config
  const errors: { file: string; error: Error }[] = [];
  const validated: string[] = [];

  for (const configFile of configFiles) {
    const relativePath = configFile;
    const absolutePath = path.join(projectDir, configFile);

    try {
      // Import the config module - this triggers validation
      await import(absolutePath);
      console.log(green(`  ✓ ${relativePath}`));
      validated.push(relativePath);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a disabled feature flag (not an error)
        if (error.message.includes("isEnabled: false")) {
          console.log(dim(`  ○ ${relativePath} (feature disabled)`));
          validated.push(relativePath);
        } else {
          console.log(red(`  ✗ ${relativePath}`));
          errors.push({ file: relativePath, error });
        }
      }
    }
  }

  console.log("");

  // Report validation errors
  if (errors.length > 0) {
    console.log(red(bold("Validation Errors:\n")));

    for (const { file, error } of errors) {
      console.log(red(`  ${file}:`));
      // Extract the actual error message
      const message = error.message.split("\n").slice(0, 3).join("\n    ");
      console.log(red(`    ${message}\n`));
    }
  }

  // Find unused env variables (in .env files but not referenced by configs)
  const envVarsInFiles = new Set<string>();

  // Parse loaded env files to get all defined variables
  for (const envFile of loadedEnvFiles) {
    try {
      const content = await Bun.file(envFile).text();
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments and empty lines
        if (!trimmed || trimmed.startsWith("#")) continue;

        // Extract variable name (before = sign)
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
        if (match) {
          envVarsInFiles.add(match[1]);
        }
      }
    } catch {
      // Ignore file read errors
    }
  }

  // Common system/framework vars to ignore
  const ignoredVars = new Set([
    // System
    "NODE_ENV",
    "PATH",
    "HOME",
    "USER",
    "SHELL",
    "TERM",
    "LANG",
    "PWD",
    "OLDPWD",
    "HOSTNAME",
    "LOGNAME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "XDG_CACHE_HOME",
    "CI",
    "TZ",
    // Vercel
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_URL",
    "VERCEL_REGION",
    "VERCEL_TARGET_ENV",
    "VERCEL_GIT_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_MESSAGE",
    "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
    "VERCEL_GIT_COMMIT_AUTHOR_NAME",
    "VERCEL_GIT_PREVIOUS_SHA",
    "VERCEL_GIT_PROVIDER",
    "VERCEL_GIT_REPO_ID",
    "VERCEL_GIT_REPO_OWNER",
    "VERCEL_GIT_REPO_SLUG",
    "VERCEL_GIT_COMMIT_REF",
    "VERCEL_GIT_PULL_REQUEST_ID",
    // Build tools (Turbo, NX)
    "TURBO_CACHE",
    "TURBO_REMOTE_ONLY",
    "TURBO_RUN_SUMMARY",
    "TURBO_DOWNLOAD_LOCAL_ENABLED",
    "NX_DAEMON",
  ]);

  // Find vars in .env files but not referenced by configs
  const unusedVars: { name: string; files: string[] }[] = [];

  for (const envVar of envVarsInFiles) {
    if (ignoredVars.has(envVar)) continue;
    if (referencedEnvVars.has(envVar)) continue;

    // Find which files define this var
    const definingFiles: string[] = [];
    for (const envFile of loadedEnvFiles) {
      try {
        const content = await Bun.file(envFile).text();
        if (new RegExp(`^${envVar}\\s*=`, "m").test(content)) {
          definingFiles.push(path.relative(projectDir, envFile));
        }
      } catch {
        // Ignore
      }
    }

    if (definingFiles.length > 0) {
      unusedVars.push({ name: envVar, files: definingFiles });
    }
  }

  // Report unused vars
  if (unusedVars.length > 0) {
    console.log(yellow(bold("Unused Environment Variables:\n")));
    console.log(
      dim(
        "  These variables are defined in .env files but not used by any config:\n",
      ),
    );

    for (const { name, files } of unusedVars.sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      console.log(yellow(`  ⚠ ${name}`));
      console.log(dim(`    defined in: ${files.join(", ")}`));
    }

    console.log("");
  }

  // Summary
  console.log(bold("Summary:\n"));
  console.log(`  Configs validated: ${green(String(validated.length))}`);
  console.log(
    `  Validation errors: ${errors.length > 0 ? red(String(errors.length)) : green("0")}`,
  );
  console.log(
    `  Unused env vars:   ${unusedVars.length > 0 ? yellow(String(unusedVars.length)) : green("0")}`,
  );
  console.log("");

  // Exit with error code if validation failed
  if (errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(red("Unexpected error:"), error);
  process.exit(1);
});
```

Next, add the script to your `package.json`:

```json
{
  "scripts": {
    "prebuild": "bun run env:validate:prod",
    "env:validate": "bun run scripts/validate-env.ts --environment=development",
    "env:validate:prod": "bun run scripts/validate-env.ts --environment=production"
  }
}
```

Use the `env:validate` and `env:validate:prod` scripts to validate all your configs (`config.ts` files in `src/lib/*/`) against your `.env` files.

The `prebuild` script (configured above) runs automatically before `build`, ensuring environment variables are validated before every build (locally and in CI/Vercel). If validation fails, the build stops early with a clear error.

The script:

1. Loads `.env` files using Next.js's `loadEnvConfig` (respects the same load order as Next.js)
2. Finds all `config.ts` files in `src/lib/*/`
3. Imports each config to trigger `configSchema` validation
4. Reports any missing or invalid environment variables
5. Warns about variables defined in `.env` files but not used by any config

Example output with a validation error:

```
🔍 Environment Configuration Validator

  Environment: development

  Loading environment files...
    ✓ .env.local
    ✓ .env.development

  Found 5 config files:

  ✗ src/lib/resend/config.ts
  ✓ src/lib/sentry/config.ts
  ✓ src/lib/db/config.ts
  ✓ src/lib/ai/config.ts
  ✓ src/lib/auth/config.ts

Validation Errors:

  src/lib/resend/config.ts:
    Configuration validation error for Resend!
    Did you correctly set all required environment variables in your .env* file?
     - server.fromEmail (FROM_EMAIL) must be defined.

Summary:

  Configs validated: 4
  Validation errors: 1
  Unused env vars:   0
```

Example output with an unused variable:

```
🔍 Environment Configuration Validator

  Environment: development

  Loading environment files...
    ✓ .env.local
    ✓ .env.development

  Found 5 config files:

  ✓ src/lib/resend/config.ts
  ✓ src/lib/sentry/config.ts
  ✓ src/lib/db/config.ts
  ✓ src/lib/ai/config.ts
  ✓ src/lib/auth/config.ts

Unused Environment Variables:

  These variables are defined in .env files but not used by any config:

  ⚠ OLD_API_KEY
    defined in: .env.local

Summary:

  Configs validated: 5
  Validation errors: 0
  Unused env vars:   1
```

The script exits with code 1 if any validation errors occur (useful for CI), but unused variables only trigger warnings without failing the build.
