import { configSchema, server } from "better-env/config-schema";

export const authConfig = configSchema("Auth", {
  secret: server({ env: "BETTER_AUTH_SECRET" }),
  url: server({ env: "BETTER_AUTH_URL" }),
  vercelClientId: server({ env: "VERCEL_CLIENT_ID", optional: true }),
  vercelClientSecret: server({ env: "VERCEL_CLIENT_SECRET", optional: true }),
});
