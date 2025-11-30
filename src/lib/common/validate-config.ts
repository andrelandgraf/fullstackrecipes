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
