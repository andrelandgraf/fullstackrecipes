import { configSchema, server } from "@/lib/config/schema";

export const authConfig = configSchema("Auth", {
  secret: server({ env: "BETTER_AUTH_SECRET" }),
  url: server({ env: "BETTER_AUTH_URL" }),
});
