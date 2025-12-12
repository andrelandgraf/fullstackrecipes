import { loadConfig } from "@/lib/common/load-config";

export const databaseConfig = loadConfig({
  env: {
    url: "DATABASE_URL",
  },
});
