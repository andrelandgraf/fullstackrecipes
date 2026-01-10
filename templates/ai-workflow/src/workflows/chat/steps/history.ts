import { db } from "@/lib/db/client";
import { messages, chats } from "@/lib/chat/schema";
import {
  persistMessage,
  insertMessageParts,
  getChatMessages,
  convertDbMessagesToUIMessages,
  clearMessageRunId,
} from "@/lib/chat/queries";
import { eq } from "drizzle-orm";
import type { ChatAgentUIMessage } from "../types";
import { v7 as uuidv7 } from "uuid";

/**
 * Persist a user message to the database.
 */
export async function persistUserMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}): Promise<void> {
  "use step";

  await persistMessage({ chatId, message });

  // Update chat timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
}

/**
 * Create a placeholder assistant message with a runId for stream resumption.
 * Parts will be added later when streaming completes.
 */
export async function createAssistantMessage({
  chatId,
  runId,
}: {
  chatId: string;
  runId: string;
}): Promise<string> {
  "use step";

  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: uuidv7(),
      chatId,
      role: "assistant",
      runId,
    })
    .returning({ messageId: messages.id });

  return messageId;
}

/**
 * Persist message parts after streaming completes.
 */
export async function persistMessageParts({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: ChatAgentUIMessage["parts"];
}): Promise<void> {
  "use step";

  await insertMessageParts(chatId, messageId, parts);

  // Update chat timestamp
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));
}

/**
 * Get message history for a chat, converted to UI message format.
 */
export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";

  const dbMessages = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(dbMessages);
}

/**
 * Clear the runId from a message after streaming is complete.
 * This marks the message as finalized.
 */
export async function removeRunId(messageId: string): Promise<void> {
  "use step";

  await clearMessageRunId(messageId);
}
