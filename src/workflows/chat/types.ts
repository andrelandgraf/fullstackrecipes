import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools } from "@/lib/ai/tools";

/**
 * Chat message type definitions
 *
 * These types define the structure of messages and parts used throughout
 * the chat workflow. They're based on the AI SDK's UIMessage types
 * with our specific tool set and data parts.
 */

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
