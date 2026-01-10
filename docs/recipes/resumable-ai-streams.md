### Start Workflow Endpoint

Create the endpoint to start workflow runs:

```typescript
// src/app/api/chats/[chatId]/messages/route.ts
import { headers } from "next/headers";
import { ensureChatExists } from "@/lib/chat/queries";
import { auth } from "@/lib/auth/server";
import { chatWorkflow } from "@/workflows/chat";
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId, message } = (await request.json()) as {
    chatId: string;
    message: ChatAgentUIMessage;
  };

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  // Ensure chat exists (create if needed) and verify ownership
  const isAuthorized = await ensureChatExists(chatId, session.user.id);
  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 });
  }

  // Start workflow with user message
  const run = await start(chatWorkflow, [
    {
      chatId,
      userMessage: message,
    },
  ]);

  // Return stream with runId for resumability
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
```

### Resume Stream Endpoint

Create the endpoint to resume workflow streams:

```typescript
// src/app/api/chats/[chatId]/messages/[runId]/stream/route.ts
import { headers } from "next/headers";
import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { auth } from "@/lib/auth/server";
import { verifyChatOwnership } from "@/lib/chat/queries";

/**
 * GET /api/chats/:chatId/messages/:runId/stream
 * Resume endpoint for workflow streams
 *
 * Query params:
 *   - startIndex: optional chunk index to resume from
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string; runId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId, runId } = await params;

  if (!runId) {
    return new Response("Missing runId parameter", { status: 400 });
  }

  const isAuthorized = await verifyChatOwnership(chatId, session.user.id);
  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex =
    startIndexParam !== null ? parseInt(startIndexParam, 10) : undefined;

  const run = await getRun(runId);
  const readable = await run.getReadable({ startIndex });

  return createUIMessageStreamResponse({
    stream: readable,
  });
}
```

### Key Workflow API Functions

**`start(workflow, args)`**

Starts a new workflow run:

- Returns `{ runId, readable }`
- `runId` uniquely identifies this run for resumption
- `readable` is a `ReadableStream` of UI message chunks

**`getRun(runId)`**

Gets an existing workflow run:

- Returns a run object with `getReadable({ startIndex? })`
- `startIndex` allows resuming from a specific chunk

### Response Headers

The `x-workflow-run-id` header is critical for resumability:

```typescript
return createUIMessageStreamResponse({
  stream: run.readable,
  headers: {
    "x-workflow-run-id": run.runId,
  },
});
```

The client captures this header and uses it for reconnection.

### Authorization

Both endpoints verify:

1. User is authenticated (session exists)
2. User owns the chat (`ensureChatExists` / `verifyChatOwnership`)

This prevents unauthorized access to other users' workflow streams.

---

## Workflow Client Integration

The client uses `WorkflowChatTransport` for automatic stream resumption.

### Resumable Chat Hook

{% registry items="use-resumable-chat" /%}

Create the hook:

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
 *
 * Uses useStateRef to track the active workflow run ID, enabling automatic
 * reconnection to interrupted streams without stale closure issues.
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

  return {
    ...chatResult,
  };
}
```

### Chat Page with Resumption Detection

Create or update the chat page with resumption detection:

```typescript
// src/app/chats/[chatId]/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Chat } from "@/components/chat/chat";
import {
  convertDbMessagesToUIMessages,
  ensureChatExists,
  getChatMessages,
} from "@/lib/chat/queries";
import { auth } from "@/lib/auth/server";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";

export const metadata: Metadata = {
  title: "Chat",
  description: "Continue your AI-powered conversation.",
};

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

  // Fetch all messages for this chat
  const persistedMessages = await getChatMessages(chatId);

  // Check if the last message is an incomplete assistant message (has runId but no parts)
  // This happens when a workflow was interrupted mid-stream
  const lastMessage = persistedMessages.at(-1);
  const isIncompleteMessage =
    lastMessage?.role === "assistant" &&
    lastMessage?.runId &&
    lastMessage?.parts.length === 0;

  // If incomplete, extract the runId for resumption and remove the empty message from history
  const initialRunId = isIncompleteMessage ? lastMessage.runId : undefined;
  const messagesToConvert = isIncompleteMessage
    ? persistedMessages.slice(0, -1)
    : persistedMessages;

  const history = convertDbMessagesToUIMessages(messagesToConvert);

  return (
    <div className="h-dvh bg-gradient-to-b from-background via-background to-muted/20 grid grid-rows-[auto_1fr]">
      <header className="z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/chats"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only text-sm font-medium">
                Back to chats
              </span>
            </Link>
            <span className="text-border hidden sm:inline">|</span>
            <span className="hidden sm:block font-mono text-lg font-semibold tracking-tight">
              AI Chat
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="min-h-0 overflow-hidden">
        <Chat
          messageHistory={history}
          chatId={chatId}
          initialRunId={initialRunId ?? undefined}
        />
      </main>
    </div>
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
