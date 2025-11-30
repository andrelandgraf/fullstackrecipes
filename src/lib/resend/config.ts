import { z } from "zod";
import { validateConfig, type PreValidate } from "../common/validate-config";

const ResendConfigSchema = z.object({
  apiKey: z.string("RESEND_API_KEY must be defined."),
  fromEmail: z.string().default("Acme <onboarding@resend.dev>"),
});

export type ResendConfig = z.infer<typeof ResendConfigSchema>;

const config: PreValidate<ResendConfig> = {
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL,
};

export const resendConfig = validateConfig(ResendConfigSchema, config);
