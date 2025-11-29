import { databaseConfig } from "../db/config";
import { aiConfig } from "../ai/config";

export const serverConfig = {
  database: databaseConfig,
  ai: aiConfig,
} as const;

export type ServerConfig = typeof serverConfig;
