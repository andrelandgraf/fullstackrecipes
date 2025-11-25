import {
  getMessageHistory,
  persistChatAgentResponse,
  streamChatAgentResponse,
} from "./steps";

/**
 * AI Chat Workflow with streaming support
 * Generates tweets using AI SDK with S2 streaming
 */
export async function chatWorkflow({ chatId }: { chatId: string }) {
  "use workflow";

  // Get message history converted to ModelMessage format
  const history = await getMessageHistory(chatId);

  // Stream AI response
  const { messages } = await streamChatAgentResponse(history);

  console.log("messages", messages);
  const newMessage = messages[messages.length - 1];
  console.log("newMessage", newMessage);
}
