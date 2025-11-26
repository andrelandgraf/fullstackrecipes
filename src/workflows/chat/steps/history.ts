import {
  convertDbMessagesToUIMessages,
  persistMessage,
  getChatMessages,
} from "@/lib/db/messages";
import type { ChatAgentUIMessage } from "../types";
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
  runId,
}: {
  chatId: string;
  runId: string;
}): Promise<string> {
  "use step";

  const [{ messageId }] = await db
    .insert(messages)
    .values({
      chatId,
      role: "assistant",
      runId,
    })
    .returning({ messageId: messages.id });

  return messageId;
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
 * Clear the runId from a message to mark workflow as complete.
 * Called at the end of the workflow after all parts are persisted.
 */
export async function removeRunId(messageId: string): Promise<void> {
  "use step";

  await db
    .update(messages)
    .set({ runId: null })
    .where(eq(messages.id, messageId));
}
