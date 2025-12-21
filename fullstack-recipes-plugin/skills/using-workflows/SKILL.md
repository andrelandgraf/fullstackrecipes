---
description: Create and run durable workflows with steps, streaming, and agent execution. Covers starting, resuming, and persisting workflow results.
---

# Working with Workflows

### Creating a Workflow

Define workflows with the `"use workflow"` directive:

```typescript
// src/workflows/chat/index.ts
export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const history = await getMessageHistory(chatId);

  const { parts } = await agent.run(history, {
    writable: getWritable(),
  });

  await persistMessageParts({ chatId, parts });
}
```

### Starting a Workflow

Use the `start` function from `workflow/api`:

```typescript
import { start } from "workflow/api";
import { chatWorkflow } from "@/workflows/chat";

const run = await start(chatWorkflow, [{ chatId, userMessage }]);

// run.runId - unique identifier for this run
// run.readable - stream of UI message chunks
```

### Resuming a Workflow Stream

Use `getRun` to reconnect to an in-progress or completed workflow:

```typescript
import { getRun } from "workflow/api";

const run = await getRun(runId);
const readable = await run.getReadable({ startIndex });
```

### Using Steps

Steps are durable checkpoints that persist their results:

```typescript
async function getMessageHistory(chatId: string) {
  "use step";

  return db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
  });
}
```

### Streaming from Workflows

Use `getWritable()` to stream data to clients:

```typescript
import { getWritable } from "workflow";

export async function chatWorkflow({ chatId }) {
  "use workflow";

  const writable = getWritable();

  // Pass to agent for streaming
  await agent.run(history, { writable });
}
```

### Getting Workflow Metadata

Access the current run's metadata:

```typescript
import { getWorkflowMetadata } from "workflow";

export async function chatWorkflow({ chatId }) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  // Store runId for resumption
  await saveRunId(chatId, workflowRunId);
}
```

### Workflow-Safe Logging

The workflow runtime doesn't support Node.js modules. Wrap logger calls in steps:

```typescript
// src/workflows/chat/steps/logger.ts
import { logger } from "@/lib/common/logger";

export async function log(
  level: "info" | "warn" | "error",
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

### Running Agents in Workflows

Use the custom `Agent` class for full streaming control:

```typescript
import { getWritable } from "workflow";
import { researchAgent } from "@/lib/ai/research";

export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const history = await getMessageHistory(chatId);

  const { parts } = await researchAgent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  await persistMessageParts({ chatId, parts });
}
```

### Persisting Workflow Results

Save agent output to the database:

```typescript
async function persistMessageParts({ chatId, parts }) {
  "use step";

  await db.insert(messages).values({
    chatId,
    role: "assistant",
    parts: JSON.stringify(parts),
  });
}
```

---

## References

- [Workflow Development Kit](https://useworkflow.dev/docs)
- [Workflow API Reference](https://useworkflow.dev/docs/api-reference)
