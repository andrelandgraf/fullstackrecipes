## Workflow Type Definitions

Define types for your chat messages and parts that work with the Workflow SDK.

### Prerequisites

- Completed [Workflow SDK Setup](/recipes/ai-agent-workflow) (Step 1)

### Chat Message Types

Create the chat type definitions:

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

### Key Types

- **`ChatAgentUIMessage`** - Full message type with metadata, data parts, and tools
- **`ChatUIMessagePart`** - Union of all possible message part types
- **`ChatDataPart`** - Custom data parts (like progress updates)
- **`ChatToolSet`** - Inferred tool types from your tool definitions

### Type Guards

The `isToolPart` and `isDataProgressPart` functions help narrow types when processing message parts:

```typescript
for (const part of message.parts) {
  if (isToolPart(part)) {
    // part is ChatToolPart
    console.log(part.toolCallId, part.input);
  } else if (isDataProgressPart(part)) {
    // part is ChatDataProgressPart
    console.log(part.data.text);
  }
}
```
