## Why a Custom Agent?

The built-in [`DurableAgent`](https://useworkflow.dev/docs/api-reference/workflow-ai/durable-agent) from `@workflow/ai/agent` covers most use cases. This custom agent is needed when:

1. **Streaming reasoning/sources** - `DurableAgent` doesn't expose `sendReasoning` or `sendSources` options
2. **UIMessage persistence** - `DurableAgent.onFinish` provides `ModelMessage[]`, but this agent provides `UIMessage` with its `parts` array directly via `toUIMessageStream().onFinish`

## How It Works

The `Agent` class wraps the AI SDK's `streamText` with a tool loop. It uses `toUIMessageStream()` internally to capture `responseMessage: UIMessage` in each step.

Key design decisions:

1. **Serializable config** - Tool functions are referenced by key and resolved inside the step executor
2. **Standalone step executor** - The `"use step"` directive only works in standalone functions, not class methods

## Defining an Agent

{% registry items="durable-agent" /%}

The agent class uses a `toolSets` object to resolve tool references by key. Update the import to match your project's tool configuration.

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

## When to Use Each

**Use `DurableAgent`** for most use cases - it's simpler and provides inline tool definitions, callbacks, and `prepareStep`.

**Use this custom agent** when you need `sendReasoning`/`sendSources` streaming or direct `UIMessage` format for persistence.

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
