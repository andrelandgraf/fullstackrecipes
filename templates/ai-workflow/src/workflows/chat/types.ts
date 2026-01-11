import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools, TOOL_TYPES } from "@/lib/ai/tools";
import assert from "@/lib/common/assert";

const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

const dataPartSchema = z.object({
  progress: z.object({
    text: z.string(),
  }),
});
export type ChatDataPart = z.infer<typeof dataPartSchema>;

export type ChatToolSet = InferUITools<typeof allTools>;

export type ChatAgentUIMessage = UIMessage<
  ChatMetadata,
  ChatDataPart,
  ChatToolSet
>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;

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

export function isToolPart(part: ChatUIMessagePart): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

export function isDataProgressPart(
  part: ChatUIMessagePart,
): part is ChatDataProgressPart {
  return part.type === "data-progress";
}

const VALID_PART_TYPES = new Set([
  "text",
  "reasoning",
  "source-url",
  "source-document",
  "file",
  "step-start",
  "data-progress",
  ...TOOL_TYPES,
]);

/**
 * Asserts that UIMessage parts are valid ChatAgentUIMessage parts.
 * Validates tool types against known TOOL_TYPES and data types against known data part types.
 */
export function assertChatAgentParts(
  parts: UIMessage["parts"],
): asserts parts is ChatAgentUIMessage["parts"] {
  for (const part of parts) {
    if (part.type.startsWith("tool-")) {
      assert(
        TOOL_TYPES.includes(part.type as (typeof TOOL_TYPES)[number]),
        `Unknown tool type: ${part.type}. Valid types: ${TOOL_TYPES.join(", ")}`,
      );
    } else if (part.type.startsWith("data-")) {
      assert(
        part.type === "data-progress",
        `Unknown data type: ${part.type}. Valid types: data-progress`,
      );
    } else {
      assert(
        VALID_PART_TYPES.has(part.type),
        `Unknown part type: ${part.type}. Valid types: ${[...VALID_PART_TYPES].join(", ")}`,
      );
    }
  }
}
