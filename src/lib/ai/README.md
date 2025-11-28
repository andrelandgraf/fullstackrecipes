# Agent

A serializable AI agent abstraction for running `streamText` in a tool loop; composable with the Workflow Development Kit.

## How It Works

The `Agent` class wraps the AI SDK's `streamText` with a tool loop that continues until the model stops making tool calls. All configuration is serializable - tools are referenced by key and resolved inside the step executor—making it compatible with workflow runtimes that require serialization.

## Defining an Agent

```ts
import { Agent } from "@/lib/ai/agent";

export const researchAgent = new Agent({
  stepOptions: {
    model: "google/gemini-3-pro-preview",
    system: "You are a research agent...",
    tools: "research", // or "drafting"
    providerOptions: {
      google: { thinkingConfig: { thinkingBudget: 8000 } },
    },
  },
  streamOptions: {
    sendReasoning: true,
    sendSources: true,
  },
});
```

## Running in a Workflow

```ts
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

```ts
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
