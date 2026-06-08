import pino from "pino";
import { mainConfig } from "@/lib/config/main";
import { loggingConfig } from "./config";

const isDev = mainConfig.server.nodeEnv === "development";

const transport = isDev
  ? pino.transport({
      target: "pino-pretty",
    })
  : undefined;

export const logger = pino(
  {
    level: loggingConfig.server.level,
  },
  transport,
);
