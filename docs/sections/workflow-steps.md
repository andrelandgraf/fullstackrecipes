## Workflow Steps

Steps are durable functions that persist their results. If a workflow is interrupted, completed steps are replayed from storage.

### The `"use step"` Directive

Mark functions as durable steps with `"use step"`:

```typescript
async function myStep(input: string): Promise<string> {
  "use step";
  // This function's result is persisted
  return await someOperation(input);
}
```

**Important**: `"use step"` only works in standalone functions, not class methods.

---

### History Steps

Create the history persistence steps:

```typescript
// src/workflows/chat/steps/history.ts
import type { UIMessage } from "ai";
import {
  convertDbMessagesToUIMessages,
  persistMessage,
  getChatMessages,
  clearMessageRunId,
  insertMessageParts,
} from "@/lib/chat/queries";
import { messages } from "@/lib/chat/schema";
import type { ChatAgentUIMessage } from "../types";
import { db } from "@/lib/db/client";

export async function persistUserMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}): Promise<void> {
  "use step";

  await persistMessage({ chatId, message, runId: null });
}

/**
 * Creates message record with runId before streaming starts,
 * enabling client stream resumption on reconnection.
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
      chatId,
      role: "assistant",
      runId,
    })
    .returning({ messageId: messages.id });

  return messageId;
}

export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";

  const messageHistory = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(messageHistory);
}

export async function removeRunId(messageId: string): Promise<void> {
  "use step";

  await clearMessageRunId(messageId);
}

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

  await insertMessageParts(
    chatId,
    messageId,
    parts as ChatAgentUIMessage["parts"],
  );
}
```

---

### Stream Steps

Create the stream control steps:

```typescript
// src/workflows/chat/steps/stream.ts
import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";

export async function startStream(messageId: string): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "start",
      messageId,
    });
  } finally {
    writer.releaseLock();
  }
}

export async function finishStream(): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "finish",
      finishReason: "stop",
    });
  } finally {
    writer.releaseLock();
  }

  await writable.close();
}
```

---

### Progress Step

Create the progress update step:

```typescript
// src/workflows/chat/steps/progress.ts
import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";
import type { ChatDataProgressPart } from "../types";
import { insertMessageParts } from "@/lib/chat/queries";

/** Writes a progress update to both the stream and database. */
export async function writeProgress(
  text: string,
  chatId: string,
  messageId: string,
): Promise<void> {
  "use step";

  const progressPart: ChatDataProgressPart = {
    type: "data-progress",
    data: {
      text,
    },
  };

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write(progressPart);
  } finally {
    writer.releaseLock();
  }

  await insertMessageParts(chatId, messageId, [progressPart]);
}
```

---

### Router Step

Create the router step for agent selection:

```typescript
// src/workflows/chat/steps/router.ts
import { generateObject, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { writeProgress } from "./progress";

const routerSystemPrompt = `You are an orchestrator agent for a tweet author system.

Analyze the conversation and determine what should happen next:

1. If the user provides a draft tweet idea, prompt, or topic that needs research:
   - Return { next: 'research' }

2. If research has been completed and the user confirms they want to proceed with drafting:
   - Return { next: 'drafting' }

3. If the user has feedback or questions about the research, or wants more information:
   - Return { next: 'research' }

4. If the conversation is just starting with a new tweet request:
   - Return { next: 'research' }

Look at the conversation history to understand the current state.`;

const routerSchema = z.object({
  next: z.enum(["research", "drafting"]).describe("The next agent to invoke"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this route was chosen"),
});

export type RouterDecision = z.infer<typeof routerSchema>;

export async function routerStep(
  chatId: string,
  messageId: string,
  history: UIMessage[],
): Promise<RouterDecision> {
  "use step";

  await writeProgress("Thinking about the next step...", chatId, messageId);

  const result = await generateObject({
    model: "google/gemini-2.5-flash",
    system: routerSystemPrompt,
    schema: routerSchema,
    messages: convertToModelMessages(history),
  });

  return result.object;
}
```

---

### Step Durability

Each step's result is persisted. If the workflow crashes after `persistUserMessage` completes but before `createAssistantMessage`:

1. Workflow restarts
2. `persistUserMessage` replays from storage (no duplicate insert)
3. `createAssistantMessage` executes fresh

This ensures exactly-once semantics for database operations.
