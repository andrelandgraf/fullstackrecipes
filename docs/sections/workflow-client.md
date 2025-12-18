## Workflow Client Integration

The client uses `WorkflowChatTransport` for automatic stream resumption.

### Resumable Chat Hook

{% registry items="use-resumable-chat" /%}

### Chat Page with Resumption Detection

Create or update the chat page with resumption detection:

```typescript
// src/app/[chatId]/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Chat } from "@/components/chat/chat";
import {
  convertDbMessagesToUIMessages,
  ensureChatExists,
  getChatMessages,
} from "@/lib/chat/queries";
import { auth } from "@/lib/auth/server";

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { chatId } = await params;
  const userId = session.user.id;

  const isAuthorized = await ensureChatExists(chatId, userId);
  if (!isAuthorized) {
    redirect("/");
  }

  const persistedMessages = await getChatMessages(chatId);

  // Check for incomplete assistant message (has runId but no parts)
  // This happens when a workflow was interrupted mid-stream
  const lastMessage = persistedMessages.at(-1);
  const isIncompleteMessage =
    lastMessage?.role === "assistant" &&
    lastMessage?.runId &&
    lastMessage?.parts.length === 0;

  // Extract runId for resumption and remove empty message from history
  const initialRunId = isIncompleteMessage ? lastMessage.runId : undefined;
  const messagesToConvert = isIncompleteMessage
    ? persistedMessages.slice(0, -1)
    : persistedMessages;

  const history = convertDbMessagesToUIMessages(messagesToConvert);

  return (
    <Chat
      messageHistory={history}
      chatId={chatId}
      initialRunId={initialRunId ?? undefined}
    />
  );
}
```

### How Resumption Detection Works

1. **On page load**, fetch all messages for the chat
2. **Check last message** - if it's an assistant message with `runId` but no parts, it's incomplete
3. **Extract `runId`** - pass to client for resumption
4. **Remove empty message** - don't show the incomplete message in UI
5. **Client resumes** - `WorkflowChatTransport` reconnects using the `runId`

### WorkflowChatTransport Options

| Option                            | Description                                     |
| --------------------------------- | ----------------------------------------------- |
| `prepareSendMessagesRequest`      | Configure the initial message send request      |
| `onChatSendMessage`               | Callback when message is sent (capture `runId`) |
| `prepareReconnectToStreamRequest` | Configure reconnection request URL              |
| `onChatEnd`                       | Callback when stream completes                  |
| `maxConsecutiveErrors`            | Number of reconnection retries                  |

### Using the Hook in Components

```tsx
"use client";

import { useResumableChat } from "@/hooks/use-resumable-chat";

export function Chat({ chatId, messageHistory, initialRunId }) {
  const { messages, sendMessage, status } = useResumableChat({
    chatId,
    messageHistory,
    initialRunId,
  });

  // Render messages and input...
}
```
