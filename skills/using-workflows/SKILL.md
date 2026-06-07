---
name: using-workflows
description: Build durable workflows with the Workflow Development Kit — steps, streaming, agent runs, metadata, and persistence. Use when authoring, starting, resuming, or persisting a workflow.
---

# Working with Workflows

Build durable workflows with steps, streaming, and agent execution.

## Prerequisites

Complete these setup recipes first:

- Workflow Development Kit Setup

### Folder Structure

Each workflow gets a subfolder under `src/workflows/`. `index.ts` orchestrates (`"use workflow"`); `steps/` holds durable checkpoints (`"use step"`); shared steps live in the top-level `steps/`.

```
src/workflows/
  steps/           # shared step functions (e.g. stream helpers)
    stream.ts
  chat/
    index.ts       # orchestration ("use workflow")
    steps/         # workflow-specific steps ("use step")
      history.ts
      logger.ts
      name-chat.ts
    types.ts       # UI message types
```

### Creating a Workflow

The orchestration function carries `"use workflow"` and calls steps. Always wrap an agent run with `startStream(messageId)` before and `finishStream()` after — `WorkflowChatTransport` needs the start/finish frames to parse the response.

```typescript
// src/workflows/chat/index.ts
import { getWorkflowMetadata, getWritable } from "workflow";
import { startStream, finishStream } from "../steps/stream";
import { chatAgent } from "@/lib/ai/chat-agent";

export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await persistUserMessage({ chatId, message: userMessage });

  // runId lets clients resume this stream later
  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });
  const history = await getMessageHistory(chatId);

  await startStream(messageId);
  const { parts } = await chatAgent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });
  await persistMessageParts({ chatId, messageId, parts });
  await finishStream();

  await removeRunId(messageId);
}
```

`startStream` writes `{ type: "start", messageId }`; `finishStream` writes `{ type: "finish", finishReason: "stop" }` and closes the writable.

### Steps

Steps are durable checkpoints that persist their results.

```typescript
async function getMessageHistory(chatId: string) {
  "use step";

  const dbMessages = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(dbMessages);
}
```

The workflow runtime can't import Node modules, so wrap logger calls in a step.

```typescript
// src/workflows/chat/steps/logger.ts
import { logger } from "@/lib/logging/logger";

export async function log(
  level: "info" | "warn" | "error" | "debug",
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

### Starting and Resuming

Start with `start` from `workflow/api`; reconnect to an in-progress or completed run with `getRun`.

```typescript
import { start, getRun } from "workflow/api";
import { chatWorkflow } from "@/workflows/chat";

const run = await start(chatWorkflow, [{ chatId, userMessage }]);
// run.runId       - unique id for this run
// run.readable    - stream of UI message chunks

const resumed = await getRun(runId);
const readable = await resumed.getReadable({ startIndex });
```

### Persisting Results

Save agent output in a step. `assertChatAgentParts` narrows the generic `UIMessage["parts"]` to the app's tool/data types before insert.

```typescript
// src/workflows/chat/steps/history.ts
import type { UIMessage } from "ai";
import { insertMessageParts } from "@/lib/chat/queries";
import { assertChatAgentParts } from "../types";

export async function persistMessageParts({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: UIMessage["parts"];
}): Promise<void> {
  "use step";

  assertChatAgentParts(parts);
  await insertMessageParts(chatId, messageId, parts);

  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
}
```

---

## References

- [Workflow Development Kit](https://useworkflow.dev/docs)
- [Workflow API Reference](https://useworkflow.dev/docs/api-reference)
