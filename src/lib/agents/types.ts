import type { UIMessageChunk, ModelMessage, UIMessage } from "ai";

/**
 * Generic result from an agent loop step
 */
export interface AgentStepResult<TMessage extends UIMessage = UIMessage> {
  /** Whether the agent wants to continue (e.g., made tool calls) */
  shouldContinue: boolean;
  /** The response message from this step */
  responseMessage: TMessage;
  /** The finish reason from the LLM */
  finishReason: string;
}

/**
 * Type alias for a writable stream of UI message chunks
 */
export type UIWritableStream = WritableStream<UIMessageChunk>;

/**
 * Configuration for converting streamText to UI stream
 */
export interface UIStreamOptions {
  /** Send start message chunk (default: true) */
  sendStart?: boolean;
  /** Send finish message chunk (default: true) */
  sendFinish?: boolean;
  /** Include reasoning in stream (default: false) */
  sendReasoning?: boolean;
  /** Include sources in stream (default: false) */
  sendSources?: boolean;
}
