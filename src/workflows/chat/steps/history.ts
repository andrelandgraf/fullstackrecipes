import type { UIMessage } from "ai";
import {
  convertDbMessagesToUIMessages,
  persistMessage,
  getChatMessages,
  clearMessageRunId,
  insertMessageParts,
} from "@/lib/db/queries/chat";
import type { ChatAgentUIMessage } from "../types";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";

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
 * Creates message record with runId before streaming starts,
 * enabling client stream resumption on reconnection.
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

export async function getMessageHistory(
  chatId: string,
): Promise<ChatAgentUIMessage[]> {
  "use step";

  const messageHistory = await getChatMessages(chatId);
  return convertDbMessagesToUIMessages(messageHistory);
}

export async function removeRunId(messageId: string): Promise<void> {
  "use step";

  await clearMessageRunId(messageId);
}

export async function persistMessageParts({
  chatId,
  messageId,
  parts,
}: {
  chatId: string;
  messageId: string;
  parts: UIMessage["parts"];
}): Promise<void> {
  "use step";

  // Cast to ChatAgentUIMessage["parts"] - the db layer handles all part types
  await insertMessageParts(
    chatId,
    messageId,
    parts as ChatAgentUIMessage["parts"],
  );
}
