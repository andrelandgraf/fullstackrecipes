# Custom Durable Agent

A custom durable AI agent abstraction for running `streamText` in a tool loop; composable with the Workflow Development Kit.

### Install via Registry

```bash
bunx shadcn@latest add https://fullstackrecipes.com/r/durable-agent.json
```

This installs `agent.ts` to `src/lib/ai/agent.ts`. You'll need to update the `./tools` import to match your project's tool configuration.

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

Define the agent class with the tool loop:

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

## Creating Agent Instances

Create specialized agents with different configurations:

```typescript
// src/lib/ai/research.ts
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

```typescript
// src/lib/ai/drafting.ts
import { Agent } from "./agent";

export const draftingAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: "You are a drafting agent...",
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

## Running in a Workflow

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

## Running Outside a Workflow

The agent works outside workflows too - useful for testing or non-durable contexts:

```typescript
import { researchAgent } from "@/lib/ai/research";

// Option 1: Just get the parts (no streaming)
const { parts, stepCount } = await researchAgent.run(history);
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

await researchAgent.run(history, { writable });
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

- [Resumable Chat Workflows](./resumable-workflows.md) - Full recipe using this agent

- [DurableAgent Documentation](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent) - Built-in alternative

- [AI SDK streamText](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streamtext) - Underlying streaming API
