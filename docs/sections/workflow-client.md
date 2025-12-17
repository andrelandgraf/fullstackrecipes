## Workflow Client Integration

The client uses `WorkflowChatTransport` for automatic stream resumption.

### Resumable Chat Hook

Create the resumable chat hook:

```typescript
// src/hooks/use-resumable-chat.ts
"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";
import { useRef } from "react";

interface UseResumableChatOptions {
  chatId: string;
  messageHistory: ChatAgentUIMessage[];
  /** Initial workflow run ID for resuming an interrupted stream */
  initialRunId?: string;
}

/**
 * Custom hook that wraps useChat with WorkflowChatTransport for resumable streaming.
 */
export function useResumableChat({
  chatId,
  messageHistory,
  initialRunId,
}: UseResumableChatOptions) {
  const activeRunIdRef = useRef<string | undefined>(initialRunId);

  const chatResult = useChat<ChatAgentUIMessage>({
    messages: messageHistory,
    resume: !!initialRunId,
    transport: new WorkflowChatTransport({
      // Send new messages
      prepareSendMessagesRequest: ({ messages }) => ({
        api: `/api/chats/${chatId}/messages`,
        body: {
          chatId,
          message: messages[messages.length - 1],
        },
      }),

      // Store the workflow run ID when a message is sent
      onChatSendMessage: (response) => {
        const workflowRunId = response.headers.get("x-workflow-run-id");
        if (workflowRunId) {
          activeRunIdRef.current = workflowRunId;
        }
      },

      // Configure reconnection to use the ref for the latest value
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const currentRunId = activeRunIdRef.current;
        if (!currentRunId) {
          throw new Error("No active workflow run ID found for reconnection");
        }
        return {
          ...rest,
          api: `/api/chats/${chatId}/messages/${encodeURIComponent(currentRunId)}/stream`,
        };
      },

      // Clear the workflow run ID when the chat stream ends
      onChatEnd: () => {
        activeRunIdRef.current = undefined;
      },

      // Retry up to 5 times on reconnection errors
      maxConsecutiveErrors: 5,
    }),
    id: chatId,
    generateId: () => uuidv7(),
  });

  return chatResult;
}
```

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
