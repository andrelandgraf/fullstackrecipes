# Custom Durable Agent

A custom durable AI agent abstraction for running `streamText` in a tool loop; composable with the Workflow Development Kit.

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
