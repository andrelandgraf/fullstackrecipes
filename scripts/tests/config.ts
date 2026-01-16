import { configSchema, server } from "@/lib/config/schema";

export const neonConfig = configSchema("Neon", {
  apiKey: server({ env: "NEON_API_KEY" }),
  projectId: server({ env: "NEON_PROJECT_ID" }),
});
