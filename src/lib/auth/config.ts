import { z } from "zod";
import { loadConfig } from "../common/load-config";

export const authConfig = loadConfig({
  env: {
    secret: "BETTER_AUTH_SECRET",
    url: "BETTER_AUTH_URL",
    vercelClientId: { env: "VERCEL_CLIENT_ID", schema: z.string().optional() },
    vercelClientSecret: {
      env: "VERCEL_CLIENT_SECRET",
      schema: z.string().optional(),
    },
  },
});
