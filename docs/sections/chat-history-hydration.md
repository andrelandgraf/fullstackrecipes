## Loading Chat History

Hydrate the chat component with previous messages when loading an existing conversation. The page fetches history server-side; the client component handles real-time updates.

### Chat Page

Create `src/app/[chatId]/page.tsx`:

```typescript
import { Chat } from "@/components/chat";
import {
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

type Props = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params;

  // Load existing messages and convert to UI format
  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  return <Chat chatId={chatId} initialMessages={history} />;
}
```

### Chat Component

Create `src/components/chat.tsx`:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage } from "@/lib/chat/types";

type Props = {
  chatId: string;
  initialMessages: ChatAgentUIMessage[];
};

export function Chat({ chatId, initialMessages }: Props) {
  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    generateId: () => uuidv7(),
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}`,
      // Send only the latest message (server loads full history)
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          message: messages[messages.length - 1],
        },
      }),
    }),
  });

  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? <p key={i}>{part.text}</p> : null,
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className="p-4 border-t"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={status !== "ready" || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Home Page with Redirect

Redirect users to a new chat on the home page:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { v7 as uuidv7 } from "uuid";

export default function Home() {
  const newChatId = uuidv7();
  redirect(`/${newChatId}`);
}
```

### Key Configuration

**UUID v7 for Message IDs**

```typescript
generateId: () => uuidv7(),
```

Client-generated UUID v7 IDs ensure messages are chronologically ordered and match server expectations.

**Custom Transport**

```typescript
transport: new DefaultChatTransport({
  api: `/api/chats/${chatId}`,
  prepareSendMessagesRequest: ({ messages }) => ({
    body: { message: messages[messages.length - 1] },
  }),
}),
```

The transport sends only the latest message. The server loads full history from the database, preventing tampering and ensuring consistency.

---

## How It Works

1. **New Chat**: User visits `/` and is redirected to `/{chatId}` with a new UUID v7
2. **Load History**: The chat page loads existing messages from the database
3. **Send Message**: Client sends user message to the API
4. **Persist User Message**: API persists user message before streaming
5. **Stream Response**: AI response streams to the client
6. **Persist Assistant Message**: `onFinish` callback persists the assistant response
7. **Reload**: User can refresh and see full conversation history

---

## Rendering Message Parts

Handle different part types in your UI:

```tsx
function MessageContent({ parts }: { parts: ChatAgentUIMessage["parts"] }) {
  return (
    <>
      {parts.map((part, i) => {
        switch (part.type) {
          case "text":
            return <p key={i}>{part.text}</p>;

          case "reasoning":
            return (
              <details key={i} className="text-sm text-gray-500">
                <summary>Thinking...</summary>
                <p>{part.text}</p>
              </details>
            );

          case "tool-countCharacters":
            return (
              <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                {part.state === "output-available" && (
                  <span>{part.output.status}</span>
                )}
                {part.state === "output-error" && (
                  <span className="text-red-600">{part.errorText}</span>
                )}
              </div>
            );

          case "data-progress":
            return (
              <p key={i} className="text-sm text-gray-500 italic">
                {part.data.text}
              </p>
            );

          case "file":
            return (
              <a key={i} href={part.url} className="text-blue-600 underline">
                {part.filename || "Download file"}
              </a>
            );

          case "source-url":
            return (
              <a key={i} href={part.url} className="text-blue-600 underline">
                {part.title || part.url}
              </a>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
```

---

## References

- [AI SDK useChat Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK UIMessage Types](https://ai-sdk.dev/docs/reference/ai-sdk-ui/ui-message)
- [UUID v7 Specification](https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format)
