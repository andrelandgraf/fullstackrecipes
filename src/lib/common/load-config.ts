import { z } from "zod";

// =============================================================================
// Types
// =============================================================================

/** Simple env value: just the value from process.env */
type EnvValueSimple = string | undefined;

/**
 * Conditional optional: this var is optional if the condition is met.
 * - `true` - always optional
 * - `false` | `undefined` - required
 * - `string` - optional if that key in the same section has a value
 * - `string[]` - optional if any of those keys have values
 */
type ConditionalOptional = boolean | string | string[];

/** Full env value object with all options */
type EnvValueFull = {
  value: string | undefined;
  schema?: z.ZodTypeAny;
  optional?: ConditionalOptional;
};

/** Env value: simple (just the value) or full object with schema and optional */
type EnvValue = EnvValueSimple | EnvValueFull;

/** Record of env values */
type EnvRecord = Record<string, EnvValue>;

/** Infer the output type from an EnvValue */
type InferEnvValue<T> = T extends string
  ? string
  : T extends undefined
    ? string // Required by default, will throw if undefined
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
type InferEnvRecord<T extends EnvRecord> = {
  [K in keyof T]: InferEnvValue<T[K]>;
};

/** Base options for loadConfig */
type LoadConfigOptionsBase<
  TServer extends EnvRecord = EnvRecord,
  TPublic extends EnvRecord = EnvRecord,
> = {
  name?: string;
  server?: TServer;
  public?: TPublic;
};

/** Options for loadConfig without a feature flag (required config) */
type LoadConfigOptionsRequired<
  TServer extends EnvRecord = EnvRecord,
  TPublic extends EnvRecord = EnvRecord,
> = LoadConfigOptionsBase<TServer, TPublic>;

/** Options for loadConfig with a feature flag (optional config) */
type LoadConfigOptionsOptional<
  TServer extends EnvRecord = EnvRecord,
  TPublic extends EnvRecord = EnvRecord,
> = LoadConfigOptionsBase<TServer, TPublic> & {
  flag: string | undefined;
};

/** Config result with server and public sections */
type ConfigResult<
  TServer extends EnvRecord,
  TPublic extends EnvRecord,
> = (TServer extends EnvRecord ? { server: InferEnvRecord<TServer> } : object) &
  (TPublic extends EnvRecord ? { public: InferEnvRecord<TPublic> } : object);

/** Config with feature flag enabled */
type EnabledConfig<
  TServer extends EnvRecord,
  TPublic extends EnvRecord,
> = ConfigResult<TServer, TPublic> & { isEnabled: true };

/** Config with feature flag disabled */
type DisabledConfig = { isEnabled: false };

/** Optional feature config */
export type FeatureConfig<
  TServer extends EnvRecord,
  TPublic extends EnvRecord,
> = EnabledConfig<TServer, TPublic> | DisabledConfig;

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
      `Configuration validation error${feature}! Did you correctly set all required environment variables in your .env* file?\n - ${message}`,
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
 * Normalizes an EnvValue to full form with value, schema, and optional.
 */
function normalizeEnvValue(value: EnvValue): {
  value: string | undefined;
  schema: z.ZodTypeAny;
  optional: ConditionalOptional | undefined;
} {
  if (typeof value === "string" || value === undefined) {
    return { value, schema: z.string(), optional: undefined };
  }
  return {
    value: value.value,
    schema: value.schema ?? z.string(),
    optional: value.optional,
  };
}

/**
 * Checks if a conditional optional is satisfied.
 * @param optional - The optional condition
 * @param sectionValues - The values in the same section to check against
 */
function isOptionalSatisfied(
  optional: ConditionalOptional | undefined,
  sectionValues: Record<string, string | undefined>,
): boolean {
  if (optional === undefined || optional === false) {
    return false; // required
  }
  if (optional === true) {
    return true; // always optional
  }
  // Check if any of the fallback keys in the same section have values
  const fallbacks = Array.isArray(optional) ? optional : [optional];
  return fallbacks.some((key) => {
    const value = sectionValues[key];
    return value !== undefined && value !== "";
  });
}

/**
 * Creates a Proxy that throws when server config is accessed on client.
 */
function createServerProxy<T extends object>(data: T): T {
  // On server, no proxy needed
  if (typeof window === "undefined") {
    return data;
  }

  return new Proxy(data, {
    get(target, prop, receiver) {
      // Allow symbols (for prototype methods like toString, valueOf, etc.)
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }

      // All string property accesses throw on client
      throw new ServerConfigClientAccessError(String(prop));
    },
  });
}

/**
 * Processes an env record section and returns validated values.
 */
function processSection(
  section: EnvRecord,
  sectionName: "server" | "public",
  featureName?: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // First pass: collect raw values for conditional optional checks
  const rawValues: Record<string, string | undefined> = {};
  for (const [key, envValue] of Object.entries(section)) {
    const { value } = normalizeEnvValue(envValue);
    rawValues[key] = value;
  }

  // Second pass: validate and transform
  for (const [key, envValue] of Object.entries(section)) {
    const { value, schema, optional } = normalizeEnvValue(envValue);

    // Check if this var can be skipped (optional or fallback exists)
    if (value === undefined && isOptionalSatisfied(optional, rawValues)) {
      result[key] = undefined;
      continue;
    }

    const parseResult = schema.safeParse(value);

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      let message: string;

      if (value === undefined) {
        if (typeof optional === "string") {
          message = `Either ${sectionName}.${key} or ${sectionName}.${optional} must be defined.`;
        } else if (Array.isArray(optional) && optional.length > 0) {
          const fallbackKeys = optional.map((k) => `${sectionName}.${k}`);
          message = `Either ${sectionName}.${key} or one of [${fallbackKeys.join(", ")}] must be defined.`;
        } else {
          message = `${sectionName}.${key} must be defined.`;
        }
      } else {
        message = `${sectionName}.${key} is invalid: ${issue?.message ?? "validation failed"}`;
      }

      throw new InvalidConfigurationError(message, featureName);
    }

    result[key] = parseResult.data;
  }

  return result;
}

// =============================================================================
// loadConfig
// =============================================================================

/**
 * Loads and validates environment configuration with type safety and runtime protection.
 *
 * **Features:**
 * - Explicit `server` and `public` sections for clarity
 * - Type-safe config with full inference
 * - Optional feature flags for conditional configs
 * - Conditional optional: "either or" values with `optional: 'otherKey'`
 * - Runtime protection: throws when `server.*` accessed on client
 * - Values passed directly, so `NEXT_PUBLIC_*` vars are properly inlined by Next.js
 *
 * @example Basic config (no flag)
 * ```ts
 * export const dbConfig = loadConfig({
 *   server: {
 *     url: process.env.DATABASE_URL,
 *     poolSize: { value: process.env.DB_POOL_SIZE, schema: z.coerce.number().default(10) },
 *   },
 * });
 * // Type: { server: { url: string; poolSize: number } }
 * ```
 *
 * @example Feature flag with mixed server/public
 * ```ts
 * export const sentryConfig = loadConfig({
 *   name: 'Sentry',
 *   flag: process.env.NEXT_PUBLIC_ENABLE_SENTRY,
 *   server: {
 *     token: process.env.SENTRY_AUTH_TOKEN,
 *   },
 *   public: {
 *     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
 *     project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
 *   },
 * });
 * // Type: FeatureConfig<...>
 *
 * if (sentryConfig.isEnabled) {
 *   sentryConfig.public.dsn;     // ✓ works everywhere
 *   sentryConfig.server.token;   // ✓ server only, throws on client
 * }
 * ```
 *
 * @example Either-or values
 * ```ts
 * export const aiConfig = loadConfig({
 *   server: {
 *     oidcToken: { value: process.env.VERCEL_OIDC_TOKEN, optional: 'apiKey' },
 *     apiKey: { value: process.env.AI_API_KEY, optional: 'oidcToken' },
 *   },
 * });
 * // At least one of oidcToken or apiKey must be defined
 * ```
 */
export function loadConfig<
  TServer extends EnvRecord = Record<string, never>,
  TPublic extends EnvRecord = Record<string, never>,
>(
  options: LoadConfigOptionsRequired<TServer, TPublic>,
): ConfigResult<TServer, TPublic>;
export function loadConfig<
  TServer extends EnvRecord = Record<string, never>,
  TPublic extends EnvRecord = Record<string, never>,
>(
  options: LoadConfigOptionsOptional<TServer, TPublic>,
): FeatureConfig<TServer, TPublic>;
export function loadConfig<
  TServer extends EnvRecord = Record<string, never>,
  TPublic extends EnvRecord = Record<string, never>,
>(
  options:
    | LoadConfigOptionsRequired<TServer, TPublic>
    | LoadConfigOptionsOptional<TServer, TPublic>,
): ConfigResult<TServer, TPublic> | FeatureConfig<TServer, TPublic> {
  const { name, server, public: publicEnv } = options;
  const flag = "flag" in options ? options.flag : undefined;
  const hasFlag = "flag" in options;

  // If feature flag provided and not enabled, return disabled
  if (hasFlag && !isFlagEnabled(flag)) {
    return { isEnabled: false };
  }

  // Build config
  const result: Record<string, unknown> = {};
  const isClient = typeof window !== "undefined";

  if (server && Object.keys(server).length > 0) {
    // On client, skip validation - server vars aren't available
    // Just create a proxy that throws on any access
    if (isClient) {
      result.server = createServerProxy({});
    } else {
      const serverData = processSection(server, "server", name);
      result.server = createServerProxy(serverData);
    }
  }

  if (publicEnv && Object.keys(publicEnv).length > 0) {
    result.public = processSection(publicEnv, "public", name);
  }

  // Return with isEnabled if feature flag was provided
  if (hasFlag) {
    return { ...result, isEnabled: true } as FeatureConfig<TServer, TPublic>;
  }

  return result as ConfigResult<TServer, TPublic>;
}
