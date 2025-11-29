## API Route with Persistence

The API route handles streaming AI responses while persisting messages to the database. User messages are saved before streaming; assistant messages are saved via the `onFinish` callback.

### Route Handler

Create `src/app/api/chats/[chatId]/route.ts`:

```typescript
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { ChatAgentUIMessage } from "@/lib/chat/types";
import { allTools } from "@/lib/ai/tools";
import {
  ensureChatExists,
  persistMessage,
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

const systemPrompt = `You are a tweet drafting assistant. Help users craft 
engaging tweets within 280 characters. Use the countCharacters tool to verify 
length before presenting final drafts. Offer variations and explain your 
reasoning for word choices.`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const { message }: { message: ChatAgentUIMessage } = await req.json();

  // Ensure chat exists before persisting messages
  await ensureChatExists(chatId);

  // Persist user message before streaming
  await persistMessage({ chatId, message });

  // Load full conversation history from database
  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  const result = streamText({
    model: "google/gemini-2.5-pro-preview-05-06",
    system: systemPrompt,
    messages: convertToModelMessages(history),
    tools: allTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      // Persist assistant response after streaming completes
      await persistMessage({
        chatId,
        message: responseMessage as ChatAgentUIMessage,
      });
    },
  });
}
```

### Key Points

**Server-Side History Loading**

The API loads full history from the database rather than trusting client-sent messages:

- Single source of truth for conversation state
- Prevents message tampering or injection
- Client only sends the latest user message

**Persistence Order**

1. User message is persisted immediately (before streaming)
2. Assistant message is persisted in `onFinish` (after streaming completes)

This ensures messages are saved even if the user closes the tab mid-stream.

**Tool Execution**

Tools defined in `allTools` are automatically executed by the AI SDK. The `stepCountIs(10)` guard prevents infinite tool loops.

### Model Configuration

The example uses the Vercel AI Gateway. You can swap models by changing the model string:

```typescript
// OpenAI
model: "openai/gpt-4o";

// Anthropic
model: "anthropic/claude-sonnet-4-20250514";

// Direct provider (no gateway)
import { openai } from "@ai-sdk/openai";
model: openai("gpt-4o");
```

### Streaming Progress Updates

For long operations, stream progress updates to the client:

```typescript
import { streamText, createDataStream } from "ai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const { message }: { message: ChatAgentUIMessage } = await req.json();

  await ensureChatExists(chatId);
  await persistMessage({ chatId, message });

  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  const dataStream = createDataStream({
    execute: async (writer) => {
      // Stream progress updates
      writer.writeData({
        type: "data-progress",
        data: { text: "Analyzing request..." },
      });

      const result = streamText({
        model: "google/gemini-2.5-pro-preview-05-06",
        system: systemPrompt,
        messages: convertToModelMessages(history),
        tools: allTools,
        onFinish: async ({ responseMessage }) => {
          await persistMessage({
            chatId,
            message: responseMessage as ChatAgentUIMessage,
          });
        },
      });

      result.pipeDataStreamToResponse(writer);
    },
  });

  return dataStream.toResponse();
}
```

### Error Handling

Wrap persistence in a transaction for atomicity:

```typescript
import { db } from "@/lib/db/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const { message }: { message: ChatAgentUIMessage } = await req.json();

  await db.transaction(async (tx) => {
    await ensureChatExists(chatId);
    await persistMessage({ chatId, message });
  });

  // ... streaming logic
}
```

For the `onFinish` callback, consider retrying failed persistence:

```typescript
onFinish: async ({ responseMessage }) => {
  const maxRetries = 3;
  for (let i = 0; i < maxRetries; i++) {
    try {
      await persistMessage({
        chatId,
        message: responseMessage as ChatAgentUIMessage,
      });
      return;
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error("Failed to persist assistant message:", error);
        // Consider: queue for retry, alert monitoring, etc.
      }
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }
};
```
