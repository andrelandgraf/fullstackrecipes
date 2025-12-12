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
