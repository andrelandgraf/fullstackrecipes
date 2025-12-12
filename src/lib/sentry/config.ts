import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const SentryConfigSchema = z.object({
  dsn: z.string("NEXT_PUBLIC_SENTRY_DSN must be defined."),
  project: z.string("NEXT_PUBLIC_SENTRY_PROJECT must be defined."),
  org: z.string("NEXT_PUBLIC_SENTRY_ORG must be defined."),
});

export type SentryConfig = z.infer<typeof SentryConfigSchema>;

const config: PreValidate<SentryConfig> = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  project: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
  org: process.env.NEXT_PUBLIC_SENTRY_ORG,
};

export const sentryConfig = validateConfig(SentryConfigSchema, config);
