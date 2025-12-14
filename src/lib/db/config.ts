import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  server: {
    url: process.env.DATABASE_URL,
  },
});
