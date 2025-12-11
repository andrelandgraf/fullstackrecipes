## Build a Simple Chat

Create a basic chat interface with streaming responses.

### Step 1: Create the API route

Create `src/app/api/chat/route.ts`:

```typescript
import { convertToModelMessages, streamText, UIMessage } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    system: "You are a helpful assistant.",
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

> **Note**: Replace the model string with your preferred model. See the [AI SDK providers docs](https://ai-sdk.dev/providers/ai-sdk-providers) for available options.

### Step 2: Create the chat page

Create `src/app/page.tsx`:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Page() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex-1 space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <span className="font-medium">
              {message.role === "user" ? "You" : "AI"}:
            </span>{" "}
            {message.parts.map((part, index) =>
              part.type === "text" ? (
                <span key={index}>{part.text}</span>
              ) : null,
            )}
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="flex-1 px-3 py-2 border rounded-md"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          type="submit"
          disabled={status !== "ready"}
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

### Step 3: Test your chat

Start the development server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

---

## References

- [AI SDK Chat UI](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot)
- [AI SDK Streaming](https://ai-sdk.dev/docs/ai-sdk-core/generating-text#streaming-text)
- [useChat Hook](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
