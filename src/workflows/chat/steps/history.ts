import { getChatMessages } from "@/lib/db/queries";
import {
  convertDbMessagesToUIMessages,
  persistMessage,
  insertMessageParts,
} from "@/lib/db/messages";
import type { ChatAgentUIMessage, ChatUIMessagePart } from "../types";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Persist the user message to database
 * This is the first step - saves the incoming user message
 */
export async function persistUserMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}): Promise<void> {
  "use step";

  await persistMessage({ chatId, message, runId: null });
}

/**
 * Create an empty assistant message with runId for resumability
 * This creates the message record before streaming starts,
 * allowing the client to resume the stream via the runId
 */
export async function createAssistantMessage({
  chatId,
  messageId,
  runId,
}: {
  chatId: string;
  messageId: string;
  runId: string;
}): Promise<void> {
  "use step";

  await db.insert(messages).values({
    id: messageId,
    chatId,
    role: "assistant",
    runId,
  });
}

/**
 * Load message history from database and convert to UI message format
 */
export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";

  const messageHistory = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(messageHistory);
}

/**
 * Update the assistant message with parts and clear runId
 * Called at the end of the workflow to finalize the message
 */
export async function updateAssistantMessage({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: ChatUIMessagePart[];
}): Promise<void> {
  "use step";

  // Clear runId (workflow complete)
  await db
    .update(messages)
    .set({ runId: null })
    .where(eq(messages.id, messageId));

  // Insert all parts
  await insertMessageParts(chatId, messageId, parts);
}
