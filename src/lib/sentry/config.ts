import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const SentryConfigSchema = z.object({
  dsn: z.string("SENTRY_DSN must be defined."),
  project: z.string("SENTRY_PROJECT must be defined."),
  org: z.string("SENTRY_ORG must be defined."),
});

export type SentryConfig = z.infer<typeof SentryConfigSchema>;

const config: PreValidate<SentryConfig> = {
  dsn: process.env.SENTRY_DSN,
  project: process.env.SENTRY_PROJECT,
  org: process.env.SENTRY_ORG,
};

export const sentryConfig = validateConfig(SentryConfigSchema, config);
