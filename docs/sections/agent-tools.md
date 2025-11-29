## Defining Agent Tools

Tools give your AI agent the ability to interact with external systems and perform actions.

```typescript
// lib/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const searchTool = tool({
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    const results = await fetch(`/api/search?q=${query}`);
    return results.json();
  },
});

export const calculatorTool = tool({
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression to evaluate"),
  }),
  execute: async ({ expression }) => {
    return { result: eval(expression) };
  },
});

export const weatherTool = tool({
  description: "Get current weather for a location",
  parameters: z.object({
    location: z.string().describe("City name"),
  }),
  execute: async ({ location }) => {
    const response = await fetch(
      `https://api.weather.com/v1/current?city=${location}`,
    );
    return response.json();
  },
});
```

Each tool has a description (so the AI knows when to use it), parameters defined with Zod, and an execute function.
