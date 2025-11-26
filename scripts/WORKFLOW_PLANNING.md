# Custom Agent Loop Workflow - Planning Document

## Overview

This document outlines the plan to convert the custom agent loop from `scripts/test.ts` into a Workflow DevKit workflow while preserving full control over the agent loop (avoiding `DurableAgent`).

---

## Current Architecture Analysis

### `scripts/test.ts` - Custom Agent Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  createUIMessageStream                                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  execute({ writer })                                      │  │
│  │                                                           │  │
│  │  1. writer.write({ type: "start" })                       │  │
│  │  2. writer.write({ type: "data-progress", ... })          │  │
│  │                                                           │  │
│  │  while (!hasStopped && stepCount < 20) {                  │  │
│  │    ┌─────────────────────────────────────────────────┐    │  │
│  │    │  streamText(...)                                │    │  │
│  │    │    → onFinish: check finishReason, increment    │    │  │
│  │    │                                                 │    │  │
│  │    │  resultStream.toUIMessageStream(...)            │    │  │
│  │    │    → onFinish: append to messages               │    │  │
│  │    │                                                 │    │  │
│  │    │  writer.merge(uiMessageStream)                  │    │  │
│  │    └─────────────────────────────────────────────────┘    │  │
│  │  }                                                        │  │
│  │                                                           │  │
│  │  3. writer.write({ type: "finish" })                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  onFinish: ({ responseMessage }) => persist                     │
└─────────────────────────────────────────────────────────────────┘
```

**Key Characteristics:**

- Single unified stream for the entire agent response
- Multiple `streamText` calls merged into one response
- `createUIMessageStream` manages the writer internally
- `onFinish` callback provides the final assembled `responseMessage`

---

## The Stream Management Challenge

### Two Stream Systems

| System                  | Creates                 | Writes To                                 | Consumer                        |
| ----------------------- | ----------------------- | ----------------------------------------- | ------------------------------- |
| `createUIMessageStream` | Internal ReadableStream | Internal writer via `execute({ writer })` | `createUIMessageStreamResponse` |
| Workflow DevKit         | `getWritable()` per run | Steps write to it                         | `run.readable`                  |

### The Problem

`createUIMessageStream` expects to own the stream lifecycle:

- It creates its own internal stream
- Provides a `writer` to the `execute` function
- Has `onFinish` callback to get the assembled `responseMessage`

Workflow's `getWritable()` also expects to own the stream:

- Created per workflow run
- Steps can write to it
- Consumer reads from `run.readable`

**We can't use both systems simultaneously** - we need to choose one or bridge them.

---

## Proposed Solutions

### Option 1: Bypass `createUIMessageStream` (Recommended ✅)

Write `UIMessageChunk` directly to the workflow's writable stream.

**Pros:**

- Cleaner architecture, no stream bridging
- Aligns with Workflow DevKit examples
- Direct control over what gets written
- Better performance (no intermediate stream)

**Cons:**

- Lose `onFinish` callback with assembled `responseMessage`
- Must manually track message assembly for persistence
- Must understand `UIMessageChunk` types

**Implementation:**

```typescript
// In step function
const writable = getWritable<UIMessageChunk>();
const writer = writable.getWriter();

// Write start
await writer.write({ type: "start" });

// Pipe streamText output
const stream = streamText(...).toUIMessageStream({ sendStart: false, sendFinish: false });
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  await writer.write(value);
}
reader.releaseLock();
writer.releaseLock();
```

### Option 2: Bridge Streams (Alternative)

Create `createUIMessageStream`, then pipe its output to workflow's writable.

**Pros:**

- Keep `onFinish` callback for message assembly
- Minimal changes to existing logic

**Cons:**

- Extra stream layer (performance overhead)
- Complexity in piping/coordination
- The `createUIMessageStream` is designed for HTTP responses, not internal piping
- `onFinish` is async but we'd need to wait for pipe completion

**Implementation Sketch:**

```typescript
// Create UI stream
const uiStream = createUIMessageStream({
  execute: ({ writer }) => { ... },
  onFinish: async ({ responseMessage }) => { ... }
});

// Pipe to workflow writable
const workflowWriter = getWritable<UIMessageChunk>().getWriter();
const reader = uiStream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // value is Uint8Array, need to decode if using raw bytes
  await workflowWriter.write(value);
}
```

**Problem:** `createUIMessageStream` returns a stream of encoded bytes (for HTTP), not `UIMessageChunk` objects. This makes bridging complex.

### Option 3: Hybrid - Use `createUIMessageStream` Types Manually

Manually implement the message assembly that `createUIMessageStream` does internally.

**This is essentially Option 1** with explicit message tracking.

---

## Recommended Approach: Option 1 with Message Assembly

### Why Option 1?

1. **Workflow DevKit is designed for this** - The docs show writing `UIMessageChunk` directly
2. **No encoding/decoding overhead** - Direct object writes
3. **Clear separation** - Workflow handles streaming, we handle message logic
4. **The `toUIMessageStream` method exists** - It returns a stream of `UIMessageChunk` objects

### Message Assembly Strategy

Since we lose `onFinish` callback, we need to track message parts ourselves:

```typescript
// Track parts as we stream
const messageParts: UIMessagePart[] = [];

// In the loop, as we write chunks:
if (chunk.type === "text-delta") {
  // Accumulate text
}
if (chunk.type === "tool-call") {
  messageParts.push({ type: "tool-..." });
}
// etc.

// After loop, assemble final message for persistence
const responseMessage: ChatAgentUIMessage = {
  id: messageId,
  role: "assistant",
  parts: messageParts,
};
```

**Alternative:** Use `toUIMessageStream`'s `onFinish` callback (it still provides `responseMessage`):

```typescript
const resultStream = streamText(...);
const uiStream = resultStream.toUIMessageStream({
  onFinish: ({ responseMessage }) => {
    // This still fires! We can capture it here
    accumulatedMessages.push(responseMessage);
  }
});
```

---

## Workflow Structure

### Step Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│  chatWorkflow({ chatId })                                       │
│  "use workflow"                                                 │
│                                                                 │
│  1. const history = await getMessageHistory(chatId)             │
│     └── "use step" - Database read                              │
│                                                                 │
│  2. const writable = getWritable<UIMessageChunk>()              │
│     └── Get workflow's writable (can't interact here)           │
│                                                                 │
│  3. await startStream(writable)                                 │
│     └── "use step" - Write start + progress events              │
│                                                                 │
│  4. AGENT LOOP:                                                 │
│     let stepCount = 0                                           │
│     let messages = [...history]                                 │
│     let shouldContinue = true                                   │
│                                                                 │
│     while (shouldContinue && stepCount < MAX_STEPS) {           │
│       const result = await agentStep(writable, messages)        │
│       └── "use step" - One streamText iteration                 │
│           - Streams response to writable                        │
│           - Returns: { messages, shouldContinue }               │
│                                                                 │
│       messages = result.messages                                │
│       shouldContinue = result.shouldContinue                    │
│       stepCount++                                               │
│     }                                                           │
│                                                                 │
│  5. await finishStream(writable)                                │
│     └── "use step" - Write finish event                         │
│                                                                 │
│  6. await persistResponse(chatId, messages)                     │
│     └── "use step" - Persist final message to database          │
│                                                                 │
│  return { messages }                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Important: Why Loop in Workflow Works

The loop is in the workflow function (not deterministic by itself), but **each `agentStep` is a step**. On replay:

- The workflow re-executes the loop
- But `agentStep` returns its logged result instead of re-calling the LLM
- The loop behaves deterministically because step results are deterministic

---

## Implementation Plan

### File Structure

```
src/workflows/chat/
├── index.ts          # chatWorkflow function
├── steps/
│   ├── index.ts      # Re-exports
│   ├── history.ts    # getMessageHistory step
│   ├── stream.ts     # startStream, finishStream steps
│   └── agent.ts      # agentStep - the core LLM step
└── types.ts          # Shared types
```

### Step 1: `getMessageHistory`

```typescript
// src/workflows/chat/steps/history.ts
export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";
  const history = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(history);
}
```

### Step 2: `startStream`

```typescript
// src/workflows/chat/steps/stream.ts
export async function startStream(writable: WritableStream<UIMessageChunk>) {
  "use step";
  const writer = writable.getWriter();
  try {
    await writer.write({ type: "start" });
    await writer.write({
      type: "data-progress",
      data: { text: "Starting agent..." },
    });
  } finally {
    writer.releaseLock();
  }
}
```

### Step 3: `agentStep` (Core)

```typescript
// src/workflows/chat/steps/agent.ts
import { streamText, convertToModelMessages, UIMessageChunk } from "ai";

interface AgentStepResult {
  shouldContinue: boolean;
  responseMessage: ChatAgentUIMessage;
}

export async function agentStep(
  writable: WritableStream<UIMessageChunk>,
  messages: ChatAgentUIMessage[],
): Promise<AgentStepResult> {
  "use step";

  const writer = writable.getWriter();
  let shouldContinue = true;
  let responseMessage: ChatAgentUIMessage | null = null;

  try {
    const resultStream = streamText({
      model: "google/gemini-3-pro-preview",
      system: systemPrompt,
      tools: { ... },
      messages: convertToModelMessages(messages),
      onFinish: ({ finishReason }) => {
        shouldContinue = finishReason !== "stop";
      }
    });

    // Convert to UI message stream
    const uiStream = resultStream.toUIMessageStream({
      sendStart: false,  // We sent our own start
      sendFinish: false, // We'll send our own finish
      sendReasoning: true,
      sendSources: true,
      onFinish: ({ responseMessage: msg }) => {
        responseMessage = msg as ChatAgentUIMessage;
      }
    });

    // Pipe UI stream to workflow writable
    const reader = uiStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
    reader.releaseLock();

    // Consume the result stream to ensure onFinish fires
    await resultStream.consumeStream();

  } finally {
    writer.releaseLock();
  }

  return {
    shouldContinue,
    responseMessage: responseMessage!,
  };
}
```

### Step 4: `finishStream`

```typescript
// src/workflows/chat/steps/stream.ts
export async function finishStream(writable: WritableStream<UIMessageChunk>) {
  "use step";
  const writer = writable.getWriter();
  try {
    await writer.write({ type: "finish" });
  } finally {
    writer.releaseLock();
  }
  await writable.close();
}
```

### Step 5: `persistResponse`

```typescript
// src/workflows/chat/steps/history.ts
export async function persistResponse(
  chatId: string,
  responseMessage: ChatAgentUIMessage,
) {
  "use step";
  await persistMessage({ chatId, message: responseMessage });
}
```

### Main Workflow

```typescript
// src/workflows/chat/index.ts
import { getWritable } from "workflow";
import { UIMessageChunk } from "ai";
import { getMessageHistory, persistResponse } from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { agentStep } from "./steps/agent";

const MAX_STEPS = 20;

export async function chatWorkflow({ chatId }: { chatId: string }) {
  "use workflow";

  // Step 1: Get history
  const history = await getMessageHistory(chatId);

  // Get workflow's writable stream
  const writable = getWritable<UIMessageChunk>();

  // Step 2: Start streaming
  await startStream(writable);

  // Step 3: Agent loop
  let messages = [...history];
  let stepCount = 0;
  let shouldContinue = true;
  let lastResponseMessage: ChatAgentUIMessage | null = null;

  while (shouldContinue && stepCount < MAX_STEPS) {
    const result = await agentStep(writable, messages);
    lastResponseMessage = result.responseMessage;

    // Add response to message history for next iteration
    messages = [...messages, result.responseMessage];
    shouldContinue = result.shouldContinue;
    stepCount++;
  }

  // Step 4: Finish streaming
  await finishStream(writable);

  // Step 5: Persist the final response
  if (lastResponseMessage) {
    await persistResponse(chatId, lastResponseMessage);
  }

  return { stepCount };
}
```

---

## API Route Integration

### Starting a Workflow

```typescript
// src/app/api/chats/[chatid]/messages/route.ts
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { chatWorkflow } from "@/workflows/chat";

export async function POST(request: Request) {
  const { chatId, message } = await request.json();

  // Persist user message first
  await persistMessage({ chatId, message });

  // Start workflow
  const run = await start(chatWorkflow, [{ chatId }]);

  // Return the workflow's readable stream as UI message stream response
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
```

### Resuming a Workflow Stream

```typescript
// src/app/api/chats/[chatid]/messages/[id]/route.ts
import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

export async function GET(request: Request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const startIndex = searchParams.get("startIndex");

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });
  if (!message?.runId) {
    return new Response("No run found", { status: 404 });
  }

  const run = await getRun(message.runId);
  const stream = await run.getReadable({
    startIndex: startIndex ? parseInt(startIndex, 10) : undefined,
  });

  return createUIMessageStreamResponse({ stream });
}
```

---

## Edge Cases & Considerations

### 1. Message Assembly Across Steps

Each `agentStep` returns its `responseMessage`. For multi-step agent loops, we need to:

- Either combine them into one message (complex)
- Or treat each step as a separate assistant message (simpler)

**Recommendation:** For now, treat each step as building on the previous. The final `lastResponseMessage` contains all parts from the last step. If multi-step produces separate messages, persist each.

### 2. Tool Calls Across Steps

When `finishReason === "tool-calls"`, the agent needs another iteration. The tool results are included in the next `streamText` call via the accumulated `messages`.

The `toUIMessageStream` handles tool execution automatically (if `execute` is defined on tools). We capture the response including tool results.

### 3. Stream Errors

If a step fails mid-stream, the workflow will retry the step. But stream data already written is persisted. The consumer may see partial data followed by complete data on retry.

**Mitigation:** Consider using `FatalError` for non-retryable stream errors.

### 4. Writer Lock Management

Each step must release its writer lock before returning. Use try/finally:

```typescript
const writer = writable.getWriter();
try {
  // write operations
} finally {
  writer.releaseLock();
}
```

### 5. Multiple Writers to Same Stream

Workflow DevKit allows multiple steps to write to the same stream (locks are step-scoped). Our sequential step design naturally handles this.

---

## Testing Strategy

1. **Unit test steps individually** with mock writables
2. **Integration test the workflow** with real workflow runtime
3. **E2E test the API routes** checking stream output matches expected UI message chunks

---

## Summary

| Aspect           | Decision                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| Stream approach  | Option 1: Bypass `createUIMessageStream`, write `UIMessageChunk` directly |
| Agent loop       | Loop in workflow, each LLM call in a step                                 |
| Message assembly | Use `toUIMessageStream`'s `onFinish` callback                             |
| Persistence      | Persist after all steps complete                                          |
| Max steps        | 20 (configurable)                                                         |

This architecture preserves full control over the agent loop while integrating with Workflow DevKit's streaming and durability features.
