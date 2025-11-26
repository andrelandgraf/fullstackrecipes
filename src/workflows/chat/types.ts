import type { UIMessageChunk } from "ai";
import type {
  ChatAgentUIMessage,
  ChatUIMessagePart,
} from "@/lib/agent-chat/agent";

/**
 * Result from a single agent loop iteration
 */
export interface AgentLoopResult {
  /** Whether the agent wants to continue (tool calls made) */
  shouldContinue: boolean;
  /** The response message from this step (for history) */
  responseMessage: ChatAgentUIMessage;
}

/**
 * Workflow input parameters
 */
export interface ChatWorkflowInput {
  chatId: string;
  /** The user message to process */
  userMessage: ChatAgentUIMessage;
}

/**
 * Workflow output
 */
export interface ChatWorkflowOutput {
  stepCount: number;
  messageId: string;
}

/**
 * Type alias for the workflow's writable stream
 */
export type ChatWritableStream = WritableStream<UIMessageChunk>;
