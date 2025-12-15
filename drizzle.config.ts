import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/*/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.server.url,
  },
});
