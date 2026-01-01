import { z } from "zod";
import { configSchema, server } from "@/lib/config/schema";

export const loggingConfig = configSchema("Logging", {
  level: server({
    env: "LOG_LEVEL",
    schema: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("info"),
  }),
});
