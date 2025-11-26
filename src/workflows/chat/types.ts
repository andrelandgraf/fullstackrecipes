import type {
  UIMessageChunk,
  UIMessage,
  UIMessagePart,
  InferUITools,
} from "ai";
import { google } from "@ai-sdk/google";
import { tool } from "ai";
import { z } from "zod";

/**
 * Chat workflow type definitions
 *
 * These types define the structure of messages and parts used throughout
 * the chat workflow. They're based on the AI SDK's UIMessage types
 * with our specific tool set and data parts.
 */

// ============================================================================
// Tool Definitions (used by agents)
// ============================================================================

/**
 * Research tools - Google search for finding information
 * Note: Key names must match what's stored in the database (tool-googleSearch, tool-urlContext)
 */
export const researchTools = {
  googleSearch: google.tools.googleSearch({}) as any,
  urlContext: google.tools.urlContext({}) as any,
};

/**
 * Drafting tools - Character counting for tweet validation
 */
export const draftingTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }) => {
      const count = text.length;
      const remaining = 280 - count;
      return {
        characterCount: count,
        remainingCharacters: remaining,
        isWithinLimit: count <= 280,
        status:
          count <= 280
            ? `✓ ${count}/280 characters (${remaining} remaining)`
            : `✗ ${count}/280 characters (${Math.abs(remaining)} over limit)`,
      };
    },
  }),
};

/**
 * Combined tool set for type inference
 * All tools that can appear in UI messages
 */
const allTools = {
  ...researchTools,
  ...draftingTools,
};

/**
 * Tool type names for database schema
 * This is the single source of truth for tool types stored in the database.
 * Format: "tool-{toolName}" where toolName matches the key in allTools
 */
export const TOOL_TYPES = [
  "tool-googleSearch",
  "tool-urlContext",
  "tool-countCharacters",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];

// ============================================================================
// Message Types
// ============================================================================

// Metadata schema (currently empty, extensible for future use)
const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

// Data parts schema for custom data in messages
const dataPartSchema = z.object({
  progress: z.object({
    text: z.string(),
  }),
});
export type ChatDataPart = z.infer<typeof dataPartSchema>;

// Infer tool types from all agent tools
export type ChatToolSet = InferUITools<typeof allTools>;

// Main message types
export type ChatAgentUIMessage = UIMessage<
  ChatMetadata,
  ChatDataPart,
  ChatToolSet
>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;

// Extracted part types for type guards and component props
export type ChatTextPart = Extract<ChatUIMessagePart, { type: "text" }>;
export type ChatReasoningPart = Extract<
  ChatUIMessagePart,
  { type: "reasoning" }
>;
export type ChatSourceUrlPart = Extract<
  ChatUIMessagePart,
  { type: "source-url" }
>;
export type ChatToolPart = Extract<
  ChatUIMessagePart,
  { type: `tool-${string}` }
>;
export type ChatDataProgressPart = Extract<
  ChatUIMessagePart,
  { type: "data-progress" }
>;
export type ChatFilePart = Extract<ChatUIMessagePart, { type: "file" }>;

// ============================================================================
// Workflow Types
// ============================================================================

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
