import type { UIMessage } from "ai";

export type ChatAgentUIMessage = UIMessage;

export interface ChatWorkflowInput {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}
