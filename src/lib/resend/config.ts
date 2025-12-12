import { z } from "zod";
import { loadConfig } from "../common/load-config";

export const resendConfig = loadConfig({
  env: {
    apiKey: "RESEND_API_KEY",
    fromEmail: {
      env: "RESEND_FROM_EMAIL",
      schema: z
        .string()
        .regex(
          /^.+\s<.+@.+\..+>$/,
          'Must match "Name <email@domain.com>" format.',
        ),
    },
  },
});
