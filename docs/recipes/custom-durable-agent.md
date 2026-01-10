## Why a Custom Agent?

The Workflow Development Kit provides a built-in [`DurableAgent`](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent) class from `@workflow/ai/agent`. While it handles durable execution and tool loops, it currently lacks configuration options that `streamText` and `toUIMessageStream` expose:

- **`providerOptions`** - Configure provider-specific features like thinking budgets

- **`sendReasoning`** - Stream model reasoning/thinking to the client

- **`sendSources`** - Stream source citations to the client

- **`sendStart` / `sendFinish`** - Control start/finish message events

This custom `Agent` class provides full access to these options while maintaining workflow compatibility through serializable configuration.

## How It Works

The `Agent` class wraps the AI SDK's `streamText` with a tool loop that continues until the model stops making tool calls. All configuration is serializable - tools are referenced by key and resolved inside the step executor - making it compatible with workflow runtimes that require serialization.

Key design decisions:

1. **Serializable config** - `AgentConfig` contains only serializable values; tool functions are referenced by key

2. **Standalone step executor** - The `"use step"` directive only works in standalone functions, not class methods

3. **Flexible streaming** - Works with `getWritable()` in workflows or any `WritableStream` outside

## Defining an Agent

{% registry items="durable-agent" /%}

Create the agent class:

````typescript
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
import { aiConfig } from "./config";

type MessagePart = UIMessage["parts"][number];

export type ToolsKey = "research" | "drafting";

const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

/**
 * Serializable stream options (excludes callbacks like onFinish).
 */
export interface StreamOptions {
  sendStart?: boolean;
  sendFinish?: boolean;
  sendReasoning?: boolean;
  sendSources?: boolean;
}

/**
 * Serializable options for streamText (excludes callbacks and messages).
 */
export interface StepOptions {
  model: string;
  system: string;
  /** Tool set key - resolved to actual tools inside the step executor */
  tools: ToolsKey;
  providerOptions?: ProviderOptions;
}

/**
 * All properties must be serializable for workflow compatibility.
 */
export interface AgentConfig {
  stepOptions: StepOptions;
  streamOptions?: StreamOptions;
}

export interface AgentRunConfig {
  /** @default 20 */
  maxSteps?: number;
  /** Pass getWritable() in workflows, or any WritableStream outside */
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

/**
 * AI agent that executes streamText in a tool loop.
 *
 * Configuration is fully serializable for workflow compatibility.
 * Tools are referenced by key and resolved inside the step executor.
 *
 * @example
 * ```ts
 * const draftingAgent = new Agent({
 *   stepOptions: {
 *     model: "gpt-4o",
 *     system: "You are a drafting agent...",
 *     tools: "drafting",
 *   },
 *   streamOptions: { sendReasoning: true },
 * });
 *
 * const { parts } = await draftingAgent.run(history, {
 *   maxSteps: 10,
 *   writable: getWritable(),
 * });
 * ```
 */
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

    let modelMessages: ModelMessage[] = await convertToModelMessages(history);
    let stepCount = 0;
    let shouldContinue = true;
    let allParts: MessagePart[] = [];

    while (shouldContinue && stepCount < maxSteps) {
      const result = await executeAgentStep(modelMessages, stepConfig);

      allParts = [...allParts, ...result.responseMessage.parts];
      modelMessages = [
        ...modelMessages,
        ...(await convertToModelMessages([result.responseMessage])),
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
 * @internal
 */
async function executeAgentStep(
  messages: ModelMessage[],
  config: StepExecutorConfig,
): Promise<AgentStepResult> {
  "use step";

  const tools = toolSets[config.stepOptions.tools];

  const resultStream = streamText({
    model: aiConfig.getModel(config.stepOptions.model),
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

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
````

## Creating Agent Instances

Create specialized agents with different configurations:

```typescript
// src/lib/ai/chat-agent.ts
import { Agent } from "./agent";

export const chatAgent = new Agent({
  stepOptions: {
    model: "gpt-4o",
    system: `You are a helpful AI assistant. You can help users with a variety of tasks including research and drafting content.

When users ask you to research something, use your available tools to search for information.
When users ask you to draft content, use your drafting tools to save documents.

Be concise but thorough in your responses.`,
    tools: "research",
  },
  streamOptions: {
    sendReasoning: false,
    sendSources: false,
  },
});
```

For specialized agents with provider options:

```typescript
// src/lib/ai/research-agent.ts
import { Agent } from "./agent";

export const researchAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: "You are a research agent...",
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

## Running in a Workflow

```typescript
import { getWorkflowMetadata, getWritable } from "workflow";
import { chatAgent } from "@/lib/ai/chat-agent";

export async function chatWorkflow({ chatId, userMessage }) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  // Persist user message, create assistant placeholder
  await persistUserMessage({ chatId, message: userMessage });
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
}
```

## Running Outside a Workflow

The agent works outside workflows too - useful for testing or non-durable contexts:

```typescript
import { chatAgent } from "@/lib/ai/chat-agent";

// Option 1: Just get the parts (no streaming)
const { parts, stepCount } = await chatAgent.run(history);
console.log(`Completed in ${stepCount} steps`);

// Option 2: Stream to a custom writable
const chunks: UIMessageChunk[] = [];
const writable = new WritableStream({
  write(chunk) {
    chunks.push(chunk);
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.textDelta);
    }
  },
});

await chatAgent.run(history, { writable });
```

## Comparison with DurableAgent

| Feature           | Custom Agent           | DurableAgent        |
| ----------------- | ---------------------- | ------------------- |
| Tool loops        | Yes                    | Yes                 |
| Durable execution | Yes (via `"use step"`) | Yes                 |
| `providerOptions` | Yes                    | No                  |
| `sendReasoning`   | Yes                    | No                  |
| `sendSources`     | Yes                    | No                  |
| Stream control    | Full                   | Limited             |
| Tool definition   | Pre-defined sets       | Inline with execute |

Choose `DurableAgent` for simpler use cases where you define tools inline. Choose the custom `Agent` when you need provider-specific options or fine-grained control over the UI message stream.

## Key Implementation Details

### Why Tools Are Referenced by Key

Workflow runtimes serialize step inputs/outputs. Function references can't be serialized, so tools are stored in a `toolSets` object and looked up by key inside the step executor:

```typescript
const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

// Inside executeAgentStep:
const tools = toolSets[config.stepOptions.tools];
```

### Why the Step Executor Is Separate

The `"use step"` directive only works in standalone functions, not class methods. The step executor is extracted from the class:

```typescript
// This works:
async function executeAgentStep(...) {
  "use step";
  // ...
}

// This does NOT work:
class Agent {
  async executeStep(...) {
    "use step"; // Error: directive not supported in methods
  }
}
```

### Tool Loop Logic

The agent continues executing steps until the model stops making tool calls:

```typescript
while (shouldContinue && stepCount < maxSteps) {
  const result = await executeAgentStep(modelMessages, stepConfig);
  // ...
  shouldContinue = result.finishReason === "tool-calls";
  stepCount++;
}
```

## See Also

- [Resumable AI Streams](/recipes/resumable-ai-streams) - Full recipe using this agent

- [DurableAgent Documentation](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent) - Built-in alternative

- [AI SDK streamText](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext) - Underlying streaming API
