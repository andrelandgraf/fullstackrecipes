import { getChatMessages } from "@/lib/db/queries";
import {
  convertDbMessagesToUIMessages,
  persistMessage,
} from "@/lib/agent-chat/utils";
import { getWritable } from "workflow";
import {
  ChatAgentUIMessage,
  durableChatAgentStream,
} from "@/lib/agent-chat/agent";

/**
 * Get message history and convert to ModelMessage format
 */
export async function getMessageHistory(chatId: string) {
  "use step";

  // Load message history with parts from database
  const messageHistory = await getChatMessages(chatId);

  // Convert database messages to UIMessage format
  const uiMessages = convertDbMessagesToUIMessages(messageHistory);

  return uiMessages;
}

/**
 * Persist chat agent response to database
 */
export async function persistChatAgentResponse({
  chatId,
  message,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}) {
  "use step";

  await persistMessage({ chatId, message });
}

/**
 * Stream chat agent response
 */
export async function streamChatAgentResponse(messages: ChatAgentUIMessage[]) {
  "use step";

  const writable = await getWritable();
  return durableChatAgentStream(writable, messages);
}
