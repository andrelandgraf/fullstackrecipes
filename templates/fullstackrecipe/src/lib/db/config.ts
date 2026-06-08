import { configSchema, server } from "better-env/config-schema";

export const databaseConfig = configSchema("Database", {
  url: server({ env: "DATABASE_URL" }),
});
