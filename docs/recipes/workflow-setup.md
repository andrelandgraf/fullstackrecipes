### Step 1: Install the packages

```bash
bun add workflow @workflow/ai
```

### Step 2: Create the workflows folder

Create a `src/workflows/` folder to organize workflow code:

```
src/workflows/
```

Each workflow gets its own subfolder with a `steps/` directory for step functions and an `index.ts` for the orchestration function:

```
src/workflows/
  chat/
    index.ts       # Workflow orchestration function
    steps/         # Step functions ("use step")
      history.ts
      logger.ts
    types.ts       # Optional: workflow-specific types
```

### Step 3: Update Next.js config

Update the Next.js configuration:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

export default withWorkflow(nextConfig);
```

---

## Logging in Workflows

Workflow functions run in a restricted environment that doesn't support Node.js modules like `fs`, `events`, or `worker_threads`. Since pino uses these modules, you cannot import the logger directly in workflow functions.

Instead, wrap logger calls in a step function:

```ts
// src/workflows/chat/steps/logger.ts
import { logger } from "@/lib/logging/logger";

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
```

Then use the step in your workflow:

```ts
// src/workflows/chat/index.ts
import { log } from "./steps/logger";

export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  // Use the step wrapper instead of importing logger directly
  await log("info", "Router decision", { next, reasoning });
}
```

This pattern applies to any library that uses Node.js modules. Move the import and usage into a step function to isolate it from the workflow runtime.

---

## References

- [Workflow Development Kit Documentation](https://useworkflow.dev/docs)
- [Getting Started on Next.js](https://useworkflow.dev/docs/getting-started/next)
