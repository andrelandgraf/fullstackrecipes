# Workflow Integration & Resumability - Planning Document

## Overview

This document outlines the plan to fully integrate the chat workflow with the application, removing legacy code paths and implementing full stream resumability with `WorkflowChatTransport`.

---

## Current State Analysis

### API Route (`route.ts`)

```
┌─────────────────────────────────────────────────────────────────┐
│  POST /api/chats/{chatId}/messages                             │
│                                                                 │
│  1. Parse chatId + message from request                         │
│  2. Verify chat exists                                          │
│  3. Persist user message (directly in route) ◀── MOVE TO STEP   │
│                                                                 │
│  4. if (!enableWorkflowChat) {                                  │
│       ◀── REMOVE: Legacy agent path                             │
│     }                                                           │
│                                                                 │
│  5. Start workflow, return stream                               │
│     - workflowRunId returned in header ✓                        │
│     - BUT: No assistant message ID returned! ◀── PROBLEM        │
└─────────────────────────────────────────────────────────────────┘
```

### Current Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  chatWorkflow({ chatId })                                       │
│                                                                 │
│  1. messageId = uuidv7()                     // Pre-generate ID │
│  2. getMessageHistory(chatId)               // Step: DB read    │
│  3. startStream(writable, messageId)        // Step: Write start│
│  4. while loop: agentLoopStep(...)          // Step: LLM calls  │
│  5. finishStream(writable)                  // Step: Write finish│
│  6. persistResponseMessage(...)             // Step: Persist    │
│                                             //   ◀── TOO LATE!  │
│                                             //   Message ID not │
│                                             //   available for  │
│                                             //   resumability   │
└─────────────────────────────────────────────────────────────────┘
```

### The Resumability Solution

With `WorkflowChatTransport`, the client only needs the `workflowRunId` (from `x-workflow-run-id` header) to resume a stream:

```
GET /api/chats/{chatId}/workflows/{runId}
  → Calls getRun(runId).getReadable({ startIndex })
```

No message ID lookup needed! The `runId` is all we need for resumability.

**Remaining concern:** The assistant message should still be created early (with `runId`) so that:

1. The message exists in DB during streaming (for consistency)
2. The `runId` reference allows finding incomplete messages if needed

---

## Solution Architecture

### Key Insight: Persist First, Update Later

Create the assistant message record **at the start** of the workflow with:

- Pre-generated `messageId`
- `runId` from `getWorkflowMetadata()`
- No parts (empty message)

Then update it at the end to:

- Add all the parts
- Clear the `runId` (workflow complete)

### New Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  chatWorkflow({ chatId, userMessage })                          │
│                                                                 │
│  0. Get workflow context                                        │
│     const { workflowRunId } = getWorkflowMetadata()             │
│     const messageId = uuidv7()              // Pre-generate ID  │
│                                                                 │
│  1. persistUserMessage(chatId, userMessage) // NEW STEP         │
│     └── Move user message persistence into workflow             │
│                                                                 │
│  2. createAssistantMessage(chatId, messageId, runId) // NEW STEP│
│     └── Create empty message with runId for resumability        │
│     └── Client can resume via GET /workflows/{runId}            │
│                                                                 │
│  3. getMessageHistory(chatId)               // Step: DB read    │
│                                                                 │
│  4. startStream(writable, messageId)        // Step: Write start│
│     └── messageMetadata.messageId for UI association            │
│                                                                 │
│  5. while loop: agentLoopStep(...)          // Step: LLM calls  │
│                                                                 │
│  6. finishStream(writable)                  // Step: Write finish│
│                                                                 │
│  7. updateAssistantMessage(messageId, parts)// Step: Add parts  │
│     └── Update message with parts, clear runId                  │
│                                                                 │
│  return { messageId, stepCount }                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumability Strategy

### Key Insight: Use `runId` Directly

The `x-workflow-run-id` header already provides everything needed for resumability. There's no need to go through the message ID as an intermediary.

**Flow:**

1. Client sends message → receives `x-workflow-run-id` header
2. Stream interrupts → client reconnects using `runId` directly
3. Resume endpoint: `GET /api/chats/{chatId}/workflows/{runId}`

**Pros:**

- No database lookup on resume (just `getRun(runId)`)
- Simpler client logic
- Single source of truth for stream identity

### Message Metadata (Always Set)

We still set `messageMetadata.messageId` in the stream for proper message identity in the UI:

```typescript
// In startStream step
await writer.write({
  type: "start",
  messageMetadata: {
    messageId, // For UI message association
  },
});
```

This is already implemented and should remain - it's the standard AI SDK pattern for associating stream chunks with a message. But resumability uses `runId`, not `messageId`.

---

## WorkflowChatTransport Integration

### Current Setup (`simple.chat.tsx`)

```typescript
transport: new DefaultChatTransport({
  api: `/api/chats/${chatId}/messages`,
  prepareSendMessagesRequest: ({ messages }) => ({
    body: {
      chatId,
      message: messages[messages.length - 1],
    },
  }),
}),
```

### Server Component: Detect Incomplete Messages

In `page.tsx`, detect incomplete messages and pass the `runId` for resumption:

```typescript
// Check if the last message is an incomplete assistant message (has runId but no parts)
const lastMessage = persistedMessages.at(-1);
const isIncompleteMessage =
  lastMessage?.role === "assistant" &&
  lastMessage?.runId &&
  lastMessage?.parts.length === 0;

// If incomplete, extract the runId for resumption and remove the empty message from history
const initialRunId = isIncompleteMessage ? lastMessage.runId : undefined;
const messagesToConvert = isIncompleteMessage
  ? persistedMessages.slice(0, -1)
  : persistedMessages;

const history = convertDbMessagesToUIMessages(messagesToConvert);

return (
  <SimpleChat
    messageHistory={history}
    chatId={chatId}
    initialRunId={initialRunId}
  />
);
```

### Custom Hook: useResumableChat

The `useResumableChat` hook (`src/hooks/use-resumable-chat.ts`) uses React state instead of localStorage:

```typescript
export function useResumableChat({
  chatId,
  messageHistory,
  initialRunId,
}: UseResumableChatOptions) {
  // Track the active workflow run ID in React state
  const [activeRunId, setActiveRunId] = useState<string | undefined>(
    initialRunId,
  );

  const chatResult = useChat<ChatAgentUIMessage>({
    messages: messageHistory,
    resume: !!activeRunId,
    transport: new WorkflowChatTransport({
      prepareSendMessagesRequest: ({ messages }) => ({
        api: `/api/chats/${chatId}/messages`,
        body: { chatId, message: messages[messages.length - 1] },
      }),
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) setActiveRunId(workflowRunId);
      },
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        if (!activeRunId) throw new Error("No active workflow run ID");
        return {
          ...rest,
          api: `/api/chats/${chatId}/messages/${encodeURIComponent(activeRunId)}/stream`,
        };
      },
      onChatEnd: () => setActiveRunId(undefined),
      maxConsecutiveErrors: 5,
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });

  return { ...chatResult, activeRunId };
}
```

### SimpleChat Component

Uses the custom hook:

```typescript
export function SimpleChat({ messageHistory, chatId, initialRunId }) {
  const { messages, sendMessage, status, error } = useResumableChat({
    chatId,
    messageHistory,
    initialRunId,
  });
  // ... render UI
}
```

**Key benefits:**

- No localStorage - uses React state for `activeRunId`
- Server-side detection of incomplete messages
- Clean separation of concerns with custom hook
- Proper SSR support (no hydration mismatches)

---

## API Route Changes

### Before (Current)

```typescript
export async function POST(request: Request) {
  const { chatId, message } = await request.json();

  // Verify chat exists
  const chat = await db.query.chats.findFirst({...});
  if (!chat) return new Response("Chat not found", { status: 404 });

  // Persist user message (OUTSIDE workflow)
  await persistMessage({ chatId, message });

  // Feature flag check (REMOVE)
  if (!config.flags.enableWorkflowChat) {
    // ... legacy agent code ...
  }

  // Start workflow
  const run = await start(chatWorkflow, [{ chatId }]);
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: { "x-workflow-run-id": run.runId },
  });
}
```

### After (Proposed)

```typescript
export async function POST(request: Request) {
  const { chatId, message } = await request.json();

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  // Verify chat exists
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  // Start workflow with user message
  const run = await start(chatWorkflow, [
    {
      chatId,
      userMessage: message,
    },
  ]);

  // Return stream - runId is all the client needs for resumability
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
```

---

## Workflow Changes

### New Workflow Input Type

```typescript
// types.ts
export interface ChatWorkflowInput {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}
```

The `assistantMessageId` is generated inside the workflow using `uuidv7()` (as it currently is), and `runId` is obtained via `getWorkflowMetadata()`.

### New Steps

#### 1. `persistUserMessage` Step

```typescript
// steps/history.ts
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
```

#### 2. `createAssistantMessage` Step

```typescript
// steps/history.ts
export async function createAssistantMessage({
  chatId,
  messageId,
  runId,
}: {
  chatId: string;
  messageId: string;
  runId: string;
}): Promise<void> {
  "use step";

  // Insert empty assistant message with runId
  await db.insert(messages).values({
    id: messageId,
    chatId,
    role: "assistant",
    runId,
  });
}
```

#### 3. `updateAssistantMessage` Step (Replaces `persistResponseMessage`)

```typescript
// steps/history.ts
export async function updateAssistantMessage({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: ChatUIMessagePart[];
}): Promise<void> {
  "use step";

  // Clear runId (workflow complete) and add parts
  await db
    .update(messages)
    .set({ runId: null })
    .where(eq(messages.id, messageId));

  // Insert all parts (same logic as persistMessage but without message insert)
  await insertMessageParts(chatId, messageId, parts);
}
```

### Updated Workflow

```typescript
// index.ts
import { getWritable, getWorkflowMetadata } from "workflow";
import { v7 as uuidv7 } from "uuid";
// ... other imports

export async function chatWorkflow({
  chatId,
  userMessage,
}: ChatWorkflowInput): Promise<ChatWorkflowOutput> {
  "use workflow";

  // Get workflow run ID for resumability
  const { workflowRunId } = getWorkflowMetadata();

  // Generate message ID upfront (consistent across retries)
  const messageId = uuidv7();

  // Step 1: Persist user message
  await persistUserMessage({ chatId, message: userMessage });

  // Step 2: Create empty assistant message with runId for resumability
  await createAssistantMessage({
    chatId,
    messageId,
    runId: workflowRunId,
  });

  // Step 3: Load full message history (now includes user message)
  const history = await getMessageHistory(chatId);

  // Get workflow's writable stream
  const writable = getWritable<UIMessageChunk>();

  // Step 4: Initialize stream with messageId in metadata
  await startStream(writable, messageId);

  // Step 5: Agent loop
  let modelMessages = convertToModelMessages(history);
  let stepCount = 0;
  let shouldContinue = true;
  const allParts: ChatUIMessagePart[] = [];

  while (shouldContinue && stepCount < MAX_STEPS) {
    const result = await agentLoopStep(writable, modelMessages);
    allParts.push(...(result.responseMessage.parts as ChatUIMessagePart[]));
    modelMessages = [
      ...modelMessages,
      ...convertToModelMessages([result.responseMessage]),
    ];
    shouldContinue = result.shouldContinue;
    stepCount++;
  }

  // Step 6: Finish stream
  await finishStream(writable);

  // Step 7: Update assistant message with parts, clear runId
  await updateAssistantMessage({
    chatId,
    messageId,
    parts: allParts,
  });

  return { stepCount, messageId };
}
```

---

## Resume Endpoint

### New Endpoint: `/api/chats/{chatId}/messages/{runId}/stream`

The `WorkflowChatTransport` uses a default reconnect pattern of `${api}/${runId}/stream`. Since our send API is `/api/chats/{chatId}/messages`, the reconnect URL becomes `/api/chats/{chatId}/messages/{runId}/stream`.

```typescript
// src/app/api/chats/[chatId]/messages/[runId]/stream/route.ts
import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatid: string; runId: string }> },
) {
  const { runId } = await params;

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex =
    startIndexParam !== null ? parseInt(startIndexParam, 10) : undefined;

  const run = await getRun(runId);
  const readable = await run.getReadable({ startIndex });

  return createUIMessageStreamResponse({ stream: readable });
}
```

**Why this pattern:**

- Matches `WorkflowChatTransport`'s default reconnect URL pattern
- No custom `prepareReconnectToStreamRequest` config needed
- No database lookup needed (just `getRun(runId)`)
- Simple, convention-based routing

### Deleted Old Endpoint

Removed `/api/chats/[chatId]/messages/[id]/route.ts` - replaced by the stream endpoint above.

---

## Client Component Changes

### simple.chat.tsx Updates

```typescript
import { WorkflowChatTransport } from "@workflow/ai";

// ...

export function SimpleChat({
  messageHistory,
  chatId,
}: {
  messageHistory: ChatAgentUIMessage[];
  chatId: string;
}) {
  const { messages, sendMessage, status, error } = useChat<ChatAgentUIMessage>({
    messages: messageHistory,
    transport: new WorkflowChatTransport({
      // Send new messages
      prepareSendMessagesRequest: ({ messages }) => ({
        api: `/api/chats/${chatId}/messages`,
        body: {
          chatId,
          message: messages[messages.length - 1],
        },
      }),

      // Reconnect to interrupted streams using runId directly
      prepareReconnectToStreamRequest: ({ runId, startIndex }) => ({
        api: `/api/chats/${chatId}/workflows/${runId}?startIndex=${startIndex}`,
      }),

      // Optional callbacks for debugging
      onChatEnd: ({ chunkIndex }) => {
        console.log("Chat completed, total chunks:", chunkIndex);
      },
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });

  // ... rest unchanged
}
```

**Note:** The `runId` is automatically extracted from the `x-workflow-run-id` header by `WorkflowChatTransport` and passed to `prepareReconnectToStreamRequest` when the stream needs to be resumed.

---

## File Structure Changes

```
src/
├── app/
│   ├── [chatId]/
│   │   └── page.tsx              # MODIFY: Detect incomplete messages, pass initialRunId
│   └── api/chats/[chatId]/
│       └── messages/
│           ├── route.ts          # MODIFY: Remove legacy code, pass userMessage
│           └── [runId]/stream/
│               └── route.ts      # NEW: Resume endpoint (matches transport pattern)
├── components/
│   └── simple.chat.tsx           # MODIFY: Use useResumableChat hook
├── hooks/
│   └── use-resumable-chat.ts     # NEW: Custom hook for resumable chat
├── lib/
│   ├── config.ts                 # DELETE: Remove feature flag entirely
│   └── agent-chat/
│       └── utils.ts              # MODIFY: Extract insertMessageParts function
└── workflows/chat/
    ├── index.ts                  # MODIFY: Add user message & assistant creation
    ├── types.ts                  # MODIFY: Update input types
    └── steps/
        ├── history.ts            # MODIFY: Add new persistence steps
        ├── stream.ts             # KEEP: No changes needed
        └── agent.ts              # KEEP: No changes needed
```

---

## Migration Steps (Implementation Order)

### Phase 1: Database Schema (No schema changes needed)

The existing `messages` table already has `runId` field. ✅

### Phase 2: Workflow Changes

1. Update `types.ts` with new input type (add `userMessage`)
2. Add `persistUserMessage` step to `history.ts`
3. Add `createAssistantMessage` step to `history.ts`
4. Add `updateAssistantMessage` step to `history.ts`
5. Update `chatWorkflow` in `index.ts`:
   - Accept `userMessage` input parameter
   - Use `getWorkflowMetadata()` for `workflowRunId`
   - Call new steps in correct order

### Phase 3: API Route Changes

1. Remove `enableWorkflowChat` flag check and all legacy agent code
2. Delete `config.ts` file
3. Pass `userMessage` to workflow input
4. Keep only `x-workflow-run-id` header (no message ID header needed)

### Phase 4: New Resume Endpoint

1. Create `/api/chats/[chatId]/workflows/[runId]/route.ts`
2. Implement direct run ID based resumption

### Phase 5: Delete Old Resume Endpoint

1. Delete `/api/chats/[chatId]/messages/[id]/route.ts`

### Phase 6: Client Changes

1. Ensure `@workflow/ai` is installed
2. Update `simple.chat.tsx` to use `WorkflowChatTransport`
3. Configure send and reconnect request handlers

### Phase 7: Cleanup

1. Remove any unused imports from modified files
2. Test full flow including resumability

---

## Testing Strategy

### Unit Tests

- [ ] New persistence steps work correctly
- [ ] `createAssistantMessage` creates record with `runId`
- [ ] `updateAssistantMessage` clears `runId` and adds parts

### Integration Tests

- [ ] Full workflow creates both messages correctly
- [ ] Stream includes correct `messageId` in metadata
- [ ] Resume endpoint `/workflows/{runId}` works correctly

### E2E Tests

- [ ] Send message → stream response → persist correctly
- [ ] Simulate disconnect → reconnect via `runId` → stream resumes
- [ ] Page refresh during streaming → `WorkflowChatTransport` resumes stream

---

## Edge Cases & Considerations

### 1. Duplicate User Messages on Workflow Retry

If the workflow retries after persisting the user message, we could get duplicates.

**Mitigation:** The `"use step"` directive ensures step results are cached. On retry, `persistUserMessage` returns its cached result without re-inserting.

### 2. Orphaned Assistant Messages

If workflow fails after creating the empty assistant message but before updating it, we'd have an empty message with a `runId`.

**Mitigation:**

- The message still references the `runId`, so the workflow can be restarted
- On workflow completion (success or failure), always clear `runId`
- Consider a cleanup job for orphaned messages (runId set but workflow terminated)

### 3. Race Condition: Message History Query

After persisting user message, we query history. There's a tiny window where the message might not be visible.

**Mitigation:** Use Drizzle's transaction or ensure read-your-writes consistency. In practice, single-connection sequential calls should be fine.

### 4. Stream Interruption During Agent Loop

If the stream is interrupted mid-agent-loop, the client reconnects and gets remaining chunks.

**Consideration:** The workflow continues running. Parts are accumulated. On completion, all parts are persisted. The client may see duplicate chunks on reconnect (handled by `startIndex`).

### 5. Message ID in Stream vs runId in Header

The client receives:

- `x-workflow-run-id` header → for reconnection
- `messageMetadata.messageId` in stream → for UI message association

These serve different purposes:

- `runId` identifies the workflow execution (used for resumability)
- `messageId` identifies the assistant message (used for UI state)

---

## Summary

| Change                   | Location                           | Description                                     |
| ------------------------ | ---------------------------------- | ----------------------------------------------- |
| Remove legacy code       | `route.ts`                         | Delete non-workflow code path and flag check    |
| User message step        | `steps/history.ts`                 | New `persistUserMessage` step                   |
| Create assistant message | `steps/history.ts`                 | New `createAssistantMessage` step with `runId`  |
| Update assistant message | `steps/history.ts`                 | New `updateAssistantMessage` step               |
| Extract parts insert     | `utils.ts`                         | New `insertMessageParts` function               |
| Workflow input           | `types.ts`                         | Add `userMessage` to input                      |
| Get run ID               | `index.ts`                         | Use `getWorkflowMetadata()`                     |
| New resume endpoint      | `messages/[runId]/stream/route.ts` | Matches transport default pattern               |
| Delete old endpoint      | `messages/[id]/route.ts`           | Replaced by stream endpoint                     |
| Custom hook              | `use-resumable-chat.ts`            | Encapsulates resumable chat logic               |
| Page detection           | `page.tsx`                         | Detect incomplete messages, pass `initialRunId` |
| Client component         | `simple.chat.tsx`                  | Use `useResumableChat` hook                     |
| Delete config            | `config.ts`                        | Remove feature flag file entirely               |

This architecture provides:

- ✅ Full durability via Workflow DevKit
- ✅ Stream resumability via `WorkflowChatTransport` using `runId` directly
- ✅ Message persistence from start (enables DB-based message lookup)
- ✅ Clean separation of concerns with custom hook
- ✅ Proper handling of multi-step agent responses
- ✅ No database lookup on resume (direct `getRun(runId)`)
- ✅ React state instead of localStorage (SSR-safe)
- ✅ Server-side detection of incomplete messages
