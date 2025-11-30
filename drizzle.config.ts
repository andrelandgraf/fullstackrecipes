import { defineConfig } from "drizzle-kit";
import { databaseConfig } from "./src/lib/db/config";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.url,
  },
});

// CREATE extension pg_uuidv7;
