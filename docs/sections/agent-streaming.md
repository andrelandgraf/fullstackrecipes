## Streaming Agent Responses

Add streaming support to show the agent's reasoning in real-time using a generator function.

```typescript
// lib/agent-stream.ts
import { streamText } from "ai";

export async function* runAgentStream(task: string) {
  const tools = { search: searchTool, calculator: calculatorTool };
  const messages: Message[] = [{ role: "user", content: task }];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const stream = await streamText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages,
      tools,
    });

    for await (const chunk of stream) {
      yield {
        type: "text",
        content: chunk.text,
        iteration: iterations,
      };
    }

    const result = await stream.finalText;

    if (result.includes("TASK_COMPLETE")) {
      yield { type: "complete", iterations };
      return;
    }

    iterations++;
  }
}
```

The generator yields chunks as they arrive, allowing the UI to display progress in real-time.
