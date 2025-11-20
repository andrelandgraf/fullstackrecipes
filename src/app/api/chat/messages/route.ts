import { db } from "@/lib/db/client";
import { chats, messages, messageTexts } from "@/lib/db/schema";
import { chatWorkflow } from "@/workflows/chat";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { v7 as uuidv7 } from "uuid";
import { createUIMessageStreamResponse } from "ai";

/**
 * POST /api/chat/messages
 * Creates a new message and starts the AI chat workflow
 *
 * Body:
 *   - chatId: chat ID (string)
 *   - messageText: the text content of the user message (string)
 *
 * Returns:
 *   - messageId: the UUID v7 of the newly created assistant message
 */
export async function POST(request: Request) {
  const { chatId, messageText } = (await request.json()) as {
    chatId: string;
    messageText: string;
  };

  if (!chatId || !messageText) {
    return new Response("Missing chatId or messageText", { status: 400 });
  }

  // Find or create chat
  let chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) {
    // Create new chat
    [chat] = await db
      .insert(chats)
      .values({
        id: chatId,
      })
      .returning();
  }

  // Persist user message
  const [{ id: userMessageId }] = await db
    .insert(messages)
    .values({
      chatId,
      role: "user",
      runId: null,
    })
    .returning({ id: messages.id });

  // Persist message text
  await db.insert(messageTexts).values({
    chatId,
    messageId: userMessageId,
    text: messageText,
    providerMetadata: null,
  });

  const assistantMessageId = uuidv7();

  const run = await start(chatWorkflow, [
    {
      chatId,
      assistantMessageId,
    },
  ]);

  await db.insert(messages).values({
    id: assistantMessageId,
    chatId,
    role: "assistant",
    runId: run.runId,
  });

  const workflowStream = run.readable;
  return createUIMessageStreamResponse({
    stream: workflowStream,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
