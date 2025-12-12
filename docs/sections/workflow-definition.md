## Workflow Definition

The main workflow orchestrates agents and manages message persistence with durable execution.

### Project Structure

```
src/workflows/chat/
├── index.ts       # Main workflow definition
├── types.ts       # Type definitions
└── steps/
    ├── history.ts   # Message persistence steps
    ├── stream.ts    # Stream control steps
    ├── router.ts    # Agent routing logic
    └── progress.ts  # Progress updates
```

### Main Workflow

Create `src/workflows/chat/index.ts`:

```typescript
import { getWorkflowMetadata, getWritable } from "workflow";
import { logger } from "@/lib/common/logger";
import type { ChatAgentUIMessage } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
  persistMessageParts,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { writeProgress } from "./steps/progress";
import { researchAgent } from "@/lib/ai/research";
import { draftingAgent } from "@/lib/ai/drafting";

/**
 * Main chat workflow that routes between research and drafting agents.
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

  await persistUserMessage({ chatId, message: userMessage });

  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  const history = await getMessageHistory(chatId);

  await startStream(messageId);

  const { next, reasoning } = await routerStep(chatId, messageId, history);
  logger.info({ next, reasoning }, "Router decision");

  const progressText =
    next === "research" ? "Researching topic..." : "Authoring tweet...";
  await writeProgress(progressText, chatId, messageId);

  const agent = next === "research" ? researchAgent : draftingAgent;

  const { parts } = await agent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  await persistMessageParts({ chatId, messageId, parts });

  await finishStream();

  await removeRunId(messageId);
}
```

### The `"use workflow"` Directive

The `"use workflow"` directive marks the function as a durable workflow entry point:

- Provides access to `getWorkflowMetadata()` for the run ID
- Provides access to `getWritable()` for streaming
- Enables step-level durability for all called steps

### Workflow Flow

1. **Persist user message** - Save incoming message to database
2. **Create assistant message** - Create placeholder with `runId` for resumability
3. **Load history** - Fetch full conversation context
4. **Start stream** - Send stream start event to client
5. **Route** - Determine which agent to invoke
6. **Progress update** - Inform client what's happening
7. **Run agent** - Execute the selected agent with tool loop
8. **Persist parts** - Save agent response to database
9. **Finish stream** - Send stream finish event
10. **Clear runId** - Mark message as complete

### Why `runId` Matters

The `runId` enables stream resumption:

- Stored in the assistant message before streaming starts
- Client receives it in response headers
- If connection drops, client can reconnect using the `runId`
- Cleared after successful completion
