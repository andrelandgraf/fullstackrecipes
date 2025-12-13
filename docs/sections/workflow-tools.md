## Workflow Tool Definitions

Define tools that your agents can use within workflows.

### Tool Structure

Create the tool definitions:

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

### Why Separate Tool Sets?

Tools are grouped by function (research vs drafting) so different agents can use different capabilities:

- **Research tools** - Web search, URL context extraction
- **Drafting tools** - Character counting, formatting helpers

### Database Schema Integration

The `TOOL_TYPES` array must match your tool keys prefixed with `tool-` for the database schema's enum constraint. When adding new tools:

1. Add the tool to the appropriate tool set
2. Add `"tool-{toolKey}"` to `TOOL_TYPES`
3. Update your database schema's tool type enum

### Provider Tools

Some providers offer built-in tools (like Google's `googleSearch`). These need type casting for compatibility:

```typescript
// Google's tools have different type signatures
function asToolSetCompatible<T>(tool: T): Tool<any, any> {
  return tool as Tool<any, any>;
}

const searchTool = asToolSetCompatible(google.tools.googleSearch({}));
```
