import { generateText } from "ai";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/chat/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logging/logger";
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
