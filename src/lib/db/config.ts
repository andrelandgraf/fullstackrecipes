import { z } from "zod";
import { validateConfig, type PreValidate } from "../config/utils";

const DatabaseConfigSchema = z.object({
  url: z.string("DATABASE_URL must be defined."),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

const config: PreValidate<DatabaseConfig> = {
  url: process.env.DATABASE_URL,
};

export const databaseConfig = validateConfig(DatabaseConfigSchema, config);
