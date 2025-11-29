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
