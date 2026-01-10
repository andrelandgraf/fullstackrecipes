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
      name-chat.ts
    types.ts       # Workflow-specific types
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

## The Chat Workflow

Create the main workflow that processes user messages and generates AI responses:

```typescript
// src/workflows/chat/index.ts
import { getWorkflowMetadata, getWritable } from "workflow";
import type { ChatAgentUIMessage } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
  persistMessageParts,
} from "./steps/history";
import { log } from "./steps/logger";
import { nameChatStep } from "./steps/name-chat";
import { chatAgent } from "@/lib/ai/chat-agent";

/**
 * Main chat workflow that processes user messages and generates AI responses.
 * Uses runId for stream resumability on client reconnection.
 */
export async function chatWorkflow({
  chatId,
  userMessage,
}: {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await log("info", "Starting chat workflow", { chatId, runId: workflowRunId });

  // Persist the user message
  await persistUserMessage({ chatId, message: userMessage });

  // Create a placeholder assistant message with runId for resumability
  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  // Get full message history
  const history = await getMessageHistory(chatId);

  // Run the agent with streaming
  const { parts } = await chatAgent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  // Persist the assistant message parts
  await persistMessageParts({ chatId, messageId, parts });

  // Clear the runId to mark the message as complete
  await removeRunId(messageId);

  // Generate a chat title if this is the first message
  await nameChatStep(chatId, userMessage);

  await log("info", "Chat workflow completed", {
    chatId,
    runId: workflowRunId,
    partsCount: parts.length,
  });
}
```

---

## History Steps

Create step functions for message persistence:

```typescript
// src/workflows/chat/steps/history.ts
import { db } from "@/lib/db/client";
import { messages, chats } from "@/lib/chat/schema";
import {
  persistMessage,
  insertMessageParts,
  getChatMessages,
  convertDbMessagesToUIMessages,
  clearMessageRunId,
} from "@/lib/chat/queries";
import { eq } from "drizzle-orm";
import type { ChatAgentUIMessage } from "../types";
import { v7 as uuidv7 } from "uuid";

/**
 * Persist a user message to the database.
 */
export async function persistUserMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}): Promise<void> {
  "use step";

  await persistMessage({ chatId, message });

  // Update chat timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
}

/**
 * Create a placeholder assistant message with a runId for stream resumption.
 * Parts will be added later when streaming completes.
 */
export async function createAssistantMessage({
  chatId,
  runId,
}: {
  chatId: string;
  runId: string;
}): Promise<string> {
  "use step";

  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: uuidv7(),
      chatId,
      role: "assistant",
      runId,
    })
    .returning({ messageId: messages.id });

  return messageId;
}

/**
 * Persist message parts after streaming completes.
 */
export async function persistMessageParts({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: ChatAgentUIMessage["parts"];
}): Promise<void> {
  "use step";

  await insertMessageParts(chatId, messageId, parts);

  // Update chat timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
}

/**
 * Get message history for a chat, converted to UI message format.
 */
export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";

  const dbMessages = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(dbMessages);
}

/**
 * Clear the runId from a message after streaming is complete.
 * This marks the message as finalized.
 */
export async function removeRunId(messageId: string): Promise<void> {
  "use step";

  await clearMessageRunId(messageId);
}
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

This pattern applies to any library that uses Node.js modules. Move the import and usage into a step function to isolate it from the workflow runtime.

---

## References

- [Workflow Development Kit Documentation](https://useworkflow.dev/docs)
- [Getting Started on Next.js](https://useworkflow.dev/docs/getting-started/next)
