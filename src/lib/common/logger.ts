import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

const transport = isDev
  ? pino.transport({
      target: "pino-pretty",
    })
  : undefined;

export const logger = pino(
  {
    level: process.env.PINO_LOG_LEVEL || "info",
  },
  transport,
);
