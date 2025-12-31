import { z } from "zod";
import { configSchema, server } from "@/lib/config/schema";

export const resendConfig = configSchema("Resend", {
  apiKey: server({ env: "RESEND_API_KEY" }),
  fromEmail: server({
    env: "RESEND_FROM_EMAIL",
    schema: z
      .string()
      .regex(
        /^.+\s<.+@.+\..+>$/,
        'Must match "Name <email@domain.com>" format.',
      ),
  }),
});
