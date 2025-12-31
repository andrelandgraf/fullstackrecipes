import { logger } from "@/lib/common/logger";

type LogLevel = "info" | "warn" | "error" | "debug";

/**
 * Workflow-safe logger step.
 * Wraps pino logger calls in a step function to avoid bundling
 * Node.js modules (fs, events, worker_threads) into workflow functions.
 */
export async function log(
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>,
): Promise<void> {
  "use step";

  if (data) {
    logger[level](data, message);
  } else {
    logger[level](message);
  }
}
