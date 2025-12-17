import { configSchema, server } from "@/lib/config/schema";

export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});
