import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const AuthConfigSchema = z.object({
  secret: z.string("BETTER_AUTH_SECRET must be defined."),
  url: z.string("BETTER_AUTH_URL must be defined."),
  vercelClientId: z.string().optional(),
  vercelClientSecret: z.string().optional(),
});

export type AuthConfig = z.infer<typeof AuthConfigSchema>;

const config: PreValidate<AuthConfig> = {
  secret: process.env.BETTER_AUTH_SECRET,
  url: process.env.BETTER_AUTH_URL,
  vercelClientId: process.env.VERCEL_CLIENT_ID,
  vercelClientSecret: process.env.VERCEL_CLIENT_SECRET,
};

export const authConfig = validateConfig(AuthConfigSchema, config);
