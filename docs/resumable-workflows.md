# Resumable Chat Workflows with AI SDK

This guide shows how to build resumable AI chat workflows using the Workflow SDK. You'll learn how to create agents with tool loops, route between multiple agents, and handle stream resumption when clients reconnect.

## Prerequisites

- Completed [Setup](./setup.md) (includes Workflow SDK)
- Completed [Chat Persistence](./chat-persistence.md)

## Overview

The workflow system provides:

- **Resumable streams** - Clients can reconnect to interrupted streams
- **Step-level durability** - Each step is persisted and can be replayed
- **Agent orchestration** - Route between multiple specialized agents
- **Tool loops** - Agents can call tools repeatedly until complete

## Get Started

Refer to the [Getting started on Next.js guide](https://useworkflow.dev/docs/getting-started/next) for detailed setup instructions.

## Project Structure

```
src/
├── lib/ai/
│   ├── agent.ts       # Reusable Agent class with tool loop
│   ├── tools.ts       # Tool definitions
│   ├── research.ts    # Research agent instance
│   └── drafting.ts    # Drafting agent instance
├── lib/chat/
│   ├── queries.ts     # Database queries for messages
│   └── schema.ts      # Drizzle schema for chat tables
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

## Type Definitions

Define types for your chat messages and parts:

```typescript
// src/workflows/chat/types.ts
import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools } from "@/lib/ai/tools";

const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

const dataPartSchema = z.object({
  progress: z.object({
    text: z.string(),
  }),
});
export type ChatDataPart = z.infer<typeof dataPartSchema>;

export type ChatToolSet = InferUITools<typeof allTools>;

export type ChatAgentUIMessage = UIMessage<
  ChatMetadata,
  ChatDataPart,
  ChatToolSet
>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;

export type ChatTextPart = Extract<ChatUIMessagePart, { type: "text" }>;
export type ChatReasoningPart = Extract<
  ChatUIMessagePart,
  { type: "reasoning" }
>;
export type ChatSourceUrlPart = Extract<
  ChatUIMessagePart,
  { type: "source-url" }
>;
export type ChatToolPart = Extract<
  ChatUIMessagePart,
  { type: `tool-${string}` }
>;
export type ChatDataProgressPart = Extract<
  ChatUIMessagePart,
  { type: "data-progress" }
>;
export type ChatFilePart = Extract<ChatUIMessagePart, { type: "file" }>;

export function isToolPart(part: ChatUIMessagePart): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

export function isDataProgressPart(
  part: ChatUIMessagePart,
): part is ChatDataProgressPart {
  return part.type === "data-progress";
}
```

## Agent Class

> **Alternative to DurableAgent**: This recipe uses a custom `Agent` class instead of the built-in [`DurableAgent`](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent) from `@workflow/ai/agent`. The custom agent provides full access to `streamText` and `toUIMessageStream` options like `providerOptions`, `sendReasoning`, and `sendSources` that `DurableAgent` currently lacks. See [Custom Durable Agent](./custom-durable-agent.md) for a detailed comparison.

The `Agent` class wraps `streamText` in a tool loop. Note that `"use step"` only works in standalone functions, so the step executor is separated from the class:

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
import { researchTools, draftingTools } from "./tools";

type MessagePart = UIMessage["parts"][number];

export type ToolsKey = "research" | "drafting";

const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

export interface StreamOptions {
  sendStart?: boolean;
  sendFinish?: boolean;
  sendReasoning?: boolean;
  sendSources?: boolean;
}

export interface StepOptions {
  model: string;
  system: string;
  tools: ToolsKey;
  providerOptions?: ProviderOptions;
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

interface AgentStepResult {
  shouldContinue: boolean;
  responseMessage: UIMessage;
  finishReason: FinishReason;
}

interface StepExecutorConfig {
  stepOptions: StepOptions;
  streamOptions?: StreamOptions;
  writable?: WritableStream<UIMessageChunk>;
}

export class Agent {
  constructor(private config: AgentConfig) {}

  async run(
    history: UIMessage[],
    runConfig: AgentRunConfig = {},
  ): Promise<AgentRunResult> {
    const { maxSteps = 20, writable } = runConfig;

    const stepConfig: StepExecutorConfig = {
      stepOptions: this.config.stepOptions,
      streamOptions: this.config.streamOptions,
      writable,
    };

    let modelMessages: ModelMessage[] = convertToModelMessages(history);
    let stepCount = 0;
    let shouldContinue = true;
    let allParts: MessagePart[] = [];

    while (shouldContinue && stepCount < maxSteps) {
      const result = await executeAgentStep(modelMessages, stepConfig);

      allParts = [...allParts, ...result.responseMessage.parts];
      modelMessages = [
        ...modelMessages,
        ...convertToModelMessages([result.responseMessage]),
      ];

      shouldContinue = result.shouldContinue;
      stepCount++;
    }

    return { parts: allParts, stepCount };
  }
}

/**
 * Step executor with "use step" directive.
 * Separated from class because "use step" only works in standalone functions.
 */
async function executeAgentStep(
  messages: ModelMessage[],
  config: StepExecutorConfig,
): Promise<AgentStepResult> {
  "use step";

  const tools = toolSets[config.stepOptions.tools];

  const resultStream = streamText({
    model: config.stepOptions.model,
    system: config.stepOptions.system,
    tools,
    messages,
    providerOptions: config.stepOptions.providerOptions,
  });

  let responseMessage: UIMessage | null = null;

  const uiStream = resultStream.toUIMessageStream({
    sendStart: config.streamOptions?.sendStart ?? false,
    sendFinish: config.streamOptions?.sendFinish ?? false,
    sendReasoning: config.streamOptions?.sendReasoning ?? false,
    sendSources: config.streamOptions?.sendSources ?? false,
    onFinish: ({ responseMessage: msg }) => {
      responseMessage = msg;
    },
  });

  if (config.writable) {
    await pipeToWritable(uiStream, config.writable);
  } else {
    await consumeStream(uiStream);
  }

  await resultStream.consumeStream();
  const finishReason = await resultStream.finishReason;

  if (!responseMessage) {
    throw new Error("No response message received from stream");
  }

  const shouldContinue = finishReason === "tool-calls";

  return { shouldContinue, responseMessage, finishReason };
}

async function consumeStream<T>(stream: ReadableStream<T>): Promise<void> {
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

async function pipeToWritable<T>(
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
```

## Tool Definitions

Define tools that your agents can use:

```typescript
// src/lib/ai/tools.ts
import { google } from "@ai-sdk/google";
import { tool, type Tool } from "ai";
import { z } from "zod";

// Cast needed: @ai-sdk/google returns Tool<{}, unknown> but AI SDK expects Tool<any, any>
function asToolSetCompatible<T>(tool: T): Tool<any, any> {
  return tool as Tool<any, any>;
}

export const researchTools = {
  googleSearch: asToolSetCompatible(google.tools.googleSearch({})),
  urlContext: asToolSetCompatible(google.tools.urlContext({})),
};

export const draftingTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }) => {
      const count = text.length;
      const remaining = 280 - count;
      return {
        characterCount: count,
        remainingCharacters: remaining,
        isWithinLimit: count <= 280,
        status:
          count <= 280
            ? `${count}/280 characters (${remaining} remaining)`
            : `${count}/280 characters (${Math.abs(remaining)} over limit)`,
      };
    },
  }),
};

export const allTools = {
  ...researchTools,
  ...draftingTools,
};

// Tool type names for database schema - must match keys in allTools as "tool-{key}"
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

const researchSystemPrompt = `You are a research agent for a tweet authoring system.

Your job is to:
1. Analyze the user's tweet topic or idea
2. Research relevant information using web search
3. Find authoritative sources and context
4. Summarize your findings clearly
5. Ask the user to confirm your understanding before proceeding

When researching:
- Look up companies, technologies, people, or concepts mentioned
- Find recent news or updates if relevant
- Cite your sources so the user can verify

After presenting your research, ask the user:
"Does this capture what you want to convey? Should I proceed to drafting the tweet?"

Do NOT draft the tweet yet - just gather and present research.`;

export const researchAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: researchSystemPrompt,
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

const draftingSystemPrompt = `You are a tweet drafting agent.

Based on the research already gathered in the conversation, your job is to:
1. Draft a compelling tweet
2. Use the countCharacters tool to verify it's within Twitter's 280 character limit
3. Revise if needed to fit the limit while maintaining impact
4. Present the final tweet clearly for easy copying

Guidelines for great tweets:
- Be concise and punchy
- Lead with the hook
- Use line breaks strategically
- Avoid quotation marks around the tweet content
- No meta-commentary - just the tweet itself

After drafting, present the tweet in a code block for easy copying.`;

export const draftingAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: draftingSystemPrompt,
    tools: "drafting",
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 4000,
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
import { writeProgress } from "./steps/progress";
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

  // Start streaming to client
  await startStream(messageId);

  // Route to appropriate agent
  const { next, reasoning } = await routerStep(chatId, messageId, history);
  console.log(`Router: ${next} - ${reasoning}`);

  // Send progress update
  const progressText =
    next === "research" ? "Researching topic..." : "Authoring tweet...";
  await writeProgress(progressText, chatId, messageId);

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

### Progress Step

Send progress updates to the client:

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

### Router Step

Route between agents based on conversation context:

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

## API Routes

### Start Workflow

```typescript
// src/app/api/chats/[chatId]/messages/route.ts
import { db } from "@/lib/db/client";
import { chats } from "@/lib/chat/schema";
import { chatWorkflow } from "@/workflows/chat";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";

export async function POST(request: Request) {
  const { chatId, message } = (await request.json()) as {
    chatId: string;
    message: ChatAgentUIMessage;
  };

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const run = await start(chatWorkflow, [
    {
      chatId,
      userMessage: message,
    },
  ]);

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

/**
 * GET /api/chats/:chatId/messages/:runId/stream
 * Resume endpoint for workflow streams
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatid: string; runId: string }> },
) {
  const { runId } = await params;

  if (!runId) {
    return new Response("Missing runId parameter", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex =
    startIndexParam !== null ? parseInt(startIndexParam, 10) : undefined;

  const run = await getRun(runId);
  const readable = await run.getReadable({ startIndex });

  return createUIMessageStreamResponse({
    stream: readable,
  });
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
import type { ChatAgentUIMessage } from "@/workflows/chat/types";
import { useRef } from "react";

interface UseResumableChatOptions {
  chatId: string;
  messageHistory: ChatAgentUIMessage[];
  initialRunId?: string;
}

export function useResumableChat({
  chatId,
  messageHistory,
  initialRunId,
}: UseResumableChatOptions) {
  const activeRunIdRef = useRef<string | undefined>(initialRunId);

  const chatResult = useChat<ChatAgentUIMessage>({
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

      // Store the workflow run ID when a message is sent
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          activeRunIdRef.current = workflowRunId;
        }
      },

      // Configure reconnection to use the ref for the latest value
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const currentRunId = activeRunIdRef.current;
        if (!currentRunId) {
          throw new Error("No active workflow run ID found for reconnection");
        }
        return {
          ...rest,
          api: `/api/chats/${chatId}/messages/${encodeURIComponent(currentRunId)}/stream`,
        };
      },

      // Clear the workflow run ID when the chat stream ends
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
import { SimpleChat } from "@/components/chat/chat";
import {
  convertDbMessagesToUIMessages,
  getChatMessages,
} from "@/lib/chat/queries";
import { chats } from "@/lib/chat/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  // Create chat if it doesn't exist
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    await db.insert(chats).values({
      id: chatId,
    });
  }

  // Fetch all messages for this chat
  const persistedMessages = await getChatMessages(chatId);

  // Check if the last message is an incomplete assistant message (has runId but no parts)
  // This happens when a workflow was interrupted mid-stream
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
      initialRunId={initialRunId ?? undefined}
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

Marks functions as durable workflow steps. Each step is persisted and can be replayed if the workflow is interrupted. Note that `"use step"` only works in standalone functions, not class methods.

### The `"use workflow"` Directive

Marks the main workflow function. Provides access to `getWorkflowMetadata()` and `getWritable()`.

### Stream Ordering

- UUID v7 IDs ensure chronological ordering of message parts
- `startIndex` parameter allows resuming from a specific chunk
- Parts are sorted by ID when loading from database

### Tool Loops

The Agent class continues executing until `finishReason !== "tool-calls"`, allowing models to call tools multiple times before responding.

### Progress Updates

Use `writeProgress` to send progress updates to both the stream and database. This keeps the client informed during long-running operations like routing decisions.
