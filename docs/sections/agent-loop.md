## Agent Loop Implementation

The agent loop is the core pattern where the AI reasons through tasks step by step, using tools as needed until completion.

```typescript
// lib/agent.ts
import { generateText } from "ai";
import { searchTool, calculatorTool, weatherTool } from "./tools";

const MAX_ITERATIONS = 10;

export async function runAgent(task: string) {
  const tools = {
    search: searchTool,
    calculator: calculatorTool,
    weather: weatherTool,
  };
  const messages: Message[] = [{ role: "user", content: task }];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    const result = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      messages,
      tools,
      system: `You are a helpful assistant that solves tasks step by step.
        Think through each step carefully before acting.
        When you have completed the task, respond with TASK_COMPLETE.`,
    });

    messages.push({ role: "assistant", content: result.text });

    if (result.text.includes("TASK_COMPLETE")) {
      return {
        success: true,
        result: result.text,
        iterations,
      };
    }

    if (result.toolCalls.length > 0) {
      for (const toolCall of result.toolCalls) {
        const toolResult = await tools[toolCall.toolName].execute(
          toolCall.args,
        );
        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          toolCallId: toolCall.toolCallId,
        });
      }
    }

    iterations++;
  }

  return {
    success: false,
    result: "Max iterations reached",
    iterations,
  };
}
```

The loop continues until the AI signals completion or hits the iteration limit.
