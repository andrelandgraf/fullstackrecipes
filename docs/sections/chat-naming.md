# Automatic Chat Naming

New chats typically start with a generic title like "New chat". This recipe adds automatic title generation based on the user's first message, creating descriptive names like "React Performance Tips" or "Database Migration Help".

The naming runs as a background step after the main AI response completes, so it doesn't delay the user experience.

## The Naming Step

Create a workflow step that generates a chat title using a fast model:

```ts title="src/workflows/chat/steps/name-chat.ts"
import { generateText } from "ai";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/chat/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/common/logger";
import type { ChatAgentUIMessage } from "../types";

const DEFAULT_TITLE = "New chat";

const namingSystemPrompt = `You are a chat naming assistant. Given a user's message, generate a short, descriptive title for the conversation.

Rules:
- Keep it under 50 characters
- Be concise and descriptive
- Don't use quotes or special formatting
- Focus on the main topic or intent
- Use title case

Respond with ONLY the title, nothing else.`;

function extractUserMessageText(message: ChatAgentUIMessage): string | null {
  for (const part of message.parts) {
    if (part.type === "text" && "text" in part) {
      return part.text;
    }
  }
  return null;
}

/**
 * Generates a name for a chat if it still has the default title.
 * Uses a fast model to create a descriptive title based on the user's message.
 */
export async function nameChatStep(
  chatId: string,
  userMessage: ChatAgentUIMessage,
): Promise<void> {
  "use step";

  const userMessageText = extractUserMessageText(userMessage);
  if (!userMessageText) {
    return;
  }

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    columns: { title: true },
  });

  if (!chat || chat.title !== DEFAULT_TITLE) {
    logger.debug(
      { chatId, title: chat?.title },
      "Chat already named, skipping",
    );
    return;
  }

  try {
    const { text } = await generateText({
      model: "google/gemini-2.5-flash",
      system: namingSystemPrompt,
      prompt: userMessageText,
    });

    const newTitle = text.trim().slice(0, 100);

    if (newTitle) {
      await db
        .update(chats)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(chats.id, chatId));

      logger.info({ chatId, newTitle }, "Chat renamed");
    }
  } catch (error) {
    logger.error({ error, chatId }, "Failed to generate chat name");
  }
}
```

Key design decisions:

- **Fast model**: Uses `gemini-2.5-flash` for quick, cheap title generation
- **Idempotent**: Only renames chats with the default "New chat" title
- **Non-blocking**: Errors are logged but don't break the workflow
- **Truncated**: Limits title to 100 characters as a safety measure

## Adding to the Workflow

Import and call the naming step at the end of your chat workflow, after the main response is complete:

```ts title="src/workflows/chat/index.ts"
import { nameChatStep } from "./steps/name-chat";

export async function chatWorkflow({
  chatId,
  userMessage,
}: {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}) {
  "use workflow";

  // ... existing workflow steps ...

  await removeRunId(messageId);

  // Name the chat after the response is complete
  await nameChatStep(chatId, userMessage);
}
```

The naming step runs after `removeRunId`, meaning:

1. The AI response stream is already finished
2. The user sees the response without waiting for naming
3. The chat title updates in the background

## How It Works

1. User sends their first message to a new chat
2. Workflow processes the message and streams the AI response
3. After the response completes, `nameChatStep` runs
4. The step checks if the chat still has the default title
5. If so, it generates a new title from the user's message
6. The chat title is updated in the database

The next time the user views their chat list, they'll see the descriptive title instead of "New chat".
