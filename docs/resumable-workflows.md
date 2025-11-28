# Resumable Chat Workflows with AI SDK

This guide shows how to build resumable AI chat workflows using the Workflow SDK. You'll learn how to create agents with tool loops, route between multiple agents, and handle stream resumption when clients reconnect.

## Prerequisites

- Completed [Chat Persistence](./chat-persistence.md) setup
- Workflow SDK installed and configured

## Overview

The workflow system provides:

- **Resumable streams** - Clients can reconnect to interrupted streams
- **Step-level durability** - Each step is persisted and can be replayed
- **Agent orchestration** - Route between multiple specialized agents
- **Tool loops** - Agents can call tools repeatedly until complete

## Project Structure

```
src/
├── lib/ai/
│   ├── agent.ts       # Reusable Agent class with tool loop
│   ├── tools.ts       # Tool definitions
│   ├── research.ts    # Research agent instance
│   └── drafting.ts    # Drafting agent instance
├── workflows/chat/
│   ├── index.ts       # Main workflow definition
│   ├── types.ts       # Type definitions
│   └── steps/
│       ├── history.ts   # Message persistence steps
│       ├── stream.ts    # Stream control steps
│       ├── router.ts    # Agent routing logic
│       └── progress.ts  # Progress updates
├── hooks/
│   └── use-resumable-chat.ts  # Client hook for resumable chat
└── app/api/chats/[chatId]/
    └── messages/
        ├── route.ts              # Start workflow endpoint
        └── [runId]/stream/
            └── route.ts          # Resume stream endpoint
```

## Agent Class

The `Agent` class wraps `streamText` in a tool loop, executing steps until no more tool calls are needed:

```typescript
// src/lib/ai/agent.ts
import {
  streamText,
  convertToModelMessages,
  type FinishReason,
  type UIMessage,
  type UIMessageChunk,
  type ModelMessage,
} from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";

type MessagePart = UIMessage["parts"][number];

export type ToolsKey = "research" | "drafting";

// Tool sets are referenced by key and resolved at runtime
const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

export interface StepOptions {
  model: string;
  system: string;
  tools: ToolsKey;
  providerOptions?: ProviderOptions;
}

export interface StreamOptions {
  sendStart?: boolean;
  sendFinish?: boolean;
  sendReasoning?: boolean;
  sendSources?: boolean;
}

export interface AgentConfig {
  stepOptions: StepOptions;
  streamOptions?: StreamOptions;
}

export interface AgentRunConfig {
  maxSteps?: number;
  writable?: WritableStream<UIMessageChunk>;
}

export interface AgentRunResult {
  parts: MessagePart[];
  stepCount: number;
}

export class Agent {
  constructor(private config: AgentConfig) {}

  async run(
    history: UIMessage[],
    runConfig: AgentRunConfig = {},
  ): Promise<AgentRunResult> {
    const { maxSteps = 20, writable } = runConfig;

    let modelMessages = convertToModelMessages(history);
    let stepCount = 0;
    let shouldContinue = true;
    let allParts: MessagePart[] = [];

    while (shouldContinue && stepCount < maxSteps) {
      const result = await this.executeStep(modelMessages, writable);

      allParts = [...allParts, ...result.responseMessage.parts];
      modelMessages = [
        ...modelMessages,
        ...convertToModelMessages([result.responseMessage]),
      ];

      shouldContinue = result.finishReason === "tool-calls";
      stepCount++;
    }

    return { parts: allParts, stepCount };
  }

  private async executeStep(
    messages: ModelMessage[],
    writable?: WritableStream<UIMessageChunk>,
  ) {
    "use step";

    const tools = toolSets[this.config.stepOptions.tools];

    const resultStream = streamText({
      model: this.config.stepOptions.model,
      system: this.config.stepOptions.system,
      tools,
      messages,
      providerOptions: this.config.stepOptions.providerOptions,
    });

    let responseMessage: UIMessage | null = null;

    const uiStream = resultStream.toUIMessageStream({
      sendStart: this.config.streamOptions?.sendStart ?? false,
      sendFinish: this.config.streamOptions?.sendFinish ?? false,
      sendReasoning: this.config.streamOptions?.sendReasoning ?? false,
      sendSources: this.config.streamOptions?.sendSources ?? false,
      onFinish: ({ responseMessage: msg }) => {
        responseMessage = msg;
      },
    });

    if (writable) {
      await this.pipeToWritable(uiStream, writable);
    } else {
      await this.consumeStream(uiStream);
    }

    await resultStream.consumeStream();
    const finishReason = await resultStream.finishReason;

    if (!responseMessage) {
      throw new Error("No response message received from stream");
    }

    return { responseMessage, finishReason };
  }

  private async consumeStream<T>(stream: ReadableStream<T>): Promise<void> {
    const reader = stream.getReader();
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async pipeToWritable<T>(
    readable: ReadableStream<T>,
    writable: WritableStream<T>,
  ): Promise<void> {
    const writer = writable.getWriter();
    const reader = readable.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writer.write(value);
      }
    } finally {
      reader.releaseLock();
      writer.releaseLock();
    }
  }
}
```

## Tool Definitions

Define tools that your agents can use:

```typescript
// src/lib/ai/tools.ts
import { google } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";

export const researchTools = {
  googleSearch: google.tools.googleSearch({}),
  urlContext: google.tools.urlContext({}),
};

export const draftingTools = {
  countCharacters: tool({
    description: "Count characters in text to verify tweet length.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }) => {
      const count = text.length;
      return {
        characterCount: count,
        remainingCharacters: 280 - count,
        isWithinLimit: count <= 280,
      };
    },
  }),
};

export const allTools = {
  ...researchTools,
  ...draftingTools,
};

// Tool type names for database schema
export const TOOL_TYPES = [
  "tool-googleSearch",
  "tool-urlContext",
  "tool-countCharacters",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];
```

## Agent Instances

Create specialized agent instances with different configurations:

```typescript
// src/lib/ai/research.ts
import { Agent } from "./agent";

export const researchAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: `You are a research agent. Analyze topics and gather information 
using web search. Summarize findings and cite sources.`,
    tools: "research",
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 8000,
          includeThoughts: true,
        },
      },
    },
  },
  streamOptions: {
    sendReasoning: true,
    sendSources: true,
  },
});
```

```typescript
// src/lib/ai/drafting.ts
import { Agent } from "./agent";

export const draftingAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: `You are a drafting agent. Create content based on prior research.
Use countCharacters to verify length limits.`,
    tools: "drafting",
  },
  streamOptions: {
    sendReasoning: true,
  },
});
```

## Workflow Definition

The main workflow orchestrates agents and manages message persistence:

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
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { researchAgent } from "@/lib/ai/research";
import { draftingAgent } from "@/lib/ai/drafting";

export async function chatWorkflow({
  chatId,
  userMessage,
}: {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  // Persist user message
  await persistUserMessage({ chatId, message: userMessage });

  // Create assistant message with runId for resumability
  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  // Load conversation history
  const history = await getMessageHistory(chatId);

  // Route to appropriate agent
  const { next } = await routerStep(chatId, messageId, history);

  // Start streaming to client
  await startStream(messageId);

  // Run selected agent
  const agent = next === "research" ? researchAgent : draftingAgent;
  const { parts } = await agent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  // Persist agent response
  await persistMessageParts({ chatId, messageId, parts });

  // End stream
  await finishStream();

  // Clear runId to mark message as complete
  await removeRunId(messageId);
}
```

## Workflow Steps

### History Steps

Steps for managing message persistence:

```typescript
// src/workflows/chat/steps/history.ts
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import {
  persistMessage,
  getChatMessages,
  clearMessageRunId,
  insertMessageParts,
  convertDbMessagesToUIMessages,
} from "@/lib/db/queries/chat";

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
    .values({ chatId, role: "assistant", runId })
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
  await insertMessageParts(chatId, messageId, parts);
}
```

### Stream Steps

Control stream lifecycle:

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
      messageMetadata: { messageId },
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

### Router Step

Route between agents based on conversation context:

```typescript
// src/workflows/chat/steps/router.ts
import { generateObject, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";

const routerSchema = z.object({
  next: z.enum(["research", "drafting"]),
  reasoning: z.string(),
});

export async function routerStep(
  chatId: string,
  messageId: string,
  history: UIMessage[],
): Promise<z.infer<typeof routerSchema>> {
  "use step";

  const result = await generateObject({
    model: "google/gemini-2.5-flash",
    system: `Analyze the conversation and determine if we need 'research' 
(gathering information) or 'drafting' (creating content).`,
    schema: routerSchema,
    messages: convertToModelMessages(history),
  });

  return result.object;
}
```

## API Routes

### Start Workflow

```typescript
// src/app/api/chats/[chatId]/messages/route.ts
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { chatWorkflow } from "@/workflows/chat";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

export async function POST(request: Request) {
  const { chatId, message } = await request.json();

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const run = await start(chatWorkflow, [{ chatId, userMessage: message }]);

  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
```

### Resume Stream

```typescript
// src/app/api/chats/[chatId]/messages/[runId]/stream/route.ts
import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string; runId: string }> },
) {
  const { runId } = await params;

  const { searchParams } = new URL(request.url);
  const startIndex = searchParams.get("startIndex");

  const run = await getRun(runId);
  const readable = await run.getReadable({
    startIndex: startIndex ? parseInt(startIndex, 10) : undefined,
  });

  return createUIMessageStreamResponse({ stream: readable });
}
```

## Client Hook

The `useResumableChat` hook handles automatic reconnection:

```typescript
// src/hooks/use-resumable-chat.ts
"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { v7 as uuidv7 } from "uuid";
import { useRef } from "react";

interface UseResumableChatOptions {
  chatId: string;
  messageHistory: UIMessage[];
  initialRunId?: string;
}

export function useResumableChat({
  chatId,
  messageHistory,
  initialRunId,
}: UseResumableChatOptions) {
  const activeRunIdRef = useRef<string | undefined>(initialRunId);

  const chatResult = useChat({
    messages: messageHistory,
    resume: !!initialRunId,
    transport: new WorkflowChatTransport({
      // Send new messages
      prepareSendMessagesRequest: ({ messages }) => ({
        api: `/api/chats/${chatId}/messages`,
        body: {
          chatId,
          message: messages[messages.length - 1],
        },
      }),

      // Store workflow run ID from response
      onChatSendMessage: (response) => {
        const runId = response.headers.get("x-workflow-run-id");
        if (runId) activeRunIdRef.current = runId;
      },

      // Configure reconnection URL
      prepareReconnectToStreamRequest: ({ ...rest }) => {
        const runId = activeRunIdRef.current;
        if (!runId) throw new Error("No run ID for reconnection");
        return {
          ...rest,
          api: `/api/chats/${chatId}/messages/${runId}/stream`,
        };
      },

      // Clear run ID when complete
      onChatEnd: () => {
        activeRunIdRef.current = undefined;
      },

      maxConsecutiveErrors: 5,
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });

  return chatResult;
}
```

## Chat Page

Load history and detect incomplete streams for resumption:

```typescript
// src/app/[chatId]/page.tsx
import { Chat } from "@/components/chat";
import { getChatMessages } from "@/lib/db/queries/chat";

export default async function ChatPage({ params }) {
  const { chatId } = await params;

  const messages = await getChatMessages(chatId);

  // Detect incomplete assistant message (has runId = was interrupted)
  const lastMessage = messages.at(-1);
  const isIncomplete =
    lastMessage?.role === "assistant" &&
    lastMessage?.runId &&
    lastMessage?.parts.length === 0;

  const initialRunId = isIncomplete ? lastMessage.runId : undefined;
  const history = isIncomplete ? messages.slice(0, -1) : messages;

  return (
    <Chat
      chatId={chatId}
      messageHistory={history}
      initialRunId={initialRunId}
    />
  );
}
```

## How Resumability Works

1. **Workflow starts** - `workflowRunId` is generated and returned in response header
2. **Message created** - Assistant message is created with `runId` before streaming
3. **Client stores runId** - `WorkflowChatTransport` captures it from header
4. **Connection lost** - Client detects disconnect
5. **Auto-reconnect** - Transport calls resume endpoint with `runId` and `startIndex`
6. **Stream resumes** - Workflow SDK returns stream from where client left off
7. **Page reload** - Server detects incomplete message by checking for `runId`, passes to client to resume

## Key Concepts

### The `"use step"` Directive

Marks functions as durable workflow steps. Each step is persisted and can be replayed if the workflow is interrupted.

### The `"use workflow"` Directive

Marks the main workflow function. Provides access to `getWorkflowMetadata()` and `getWritable()`.

### Stream Ordering

- UUID v7 IDs ensure chronological ordering of message parts
- `startIndex` parameter allows resuming from a specific chunk
- Parts are sorted by ID when loading from database

### Tool Loops

The Agent class continues executing until `finishReason !== "tool-calls"`, allowing models to call tools multiple times before responding.
