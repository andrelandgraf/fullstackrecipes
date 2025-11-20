import { chatAgent } from "@/lib/agent-chat/agent";
import { getMessageHistory, persistChatAgentResponse } from "./steps";

/**
 * AI Chat Workflow with streaming support
 * Generates tweets using AI SDK with S2 streaming
 */
export async function chatWorkflow({
  chatId,
  assistantMessageId,
}: {
  chatId: string;
  assistantMessageId: string;
}) {
  "use workflow";

  // Get message history converted to ModelMessage format
  const coreMessages = await getMessageHistory(chatId);

  // Stream AI response
  await chatAgent.stream({
    messages: coreMessages,
  });

  await persistChatAgentResponse({ chatId, assistantMessageId });
}
