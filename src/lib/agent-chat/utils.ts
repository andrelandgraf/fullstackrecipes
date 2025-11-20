import type { UIMessage } from "@ai-sdk/react";
import type { MessageWithParts } from "@/lib/db/queries";

/**
 * Convert database messages with parts to UIMessage format
 */
export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): UIMessage[] {
  return messageHistory.map((msg) => {
    // Map database parts to UI message parts
    const uiParts = msg.parts.map((part) => {
      switch (part.type) {
        case "text":
          return {
            type: "text" as const,
            text: part.text,
          };
        case "tool":
          return {
            type: "tool-call" as const,
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            args: (part.data as any)?.args || {},
            result: (part.data as any)?.result,
          };
        case "file":
          return {
            type: "file" as const,
            data: part.url,
            mimeType: part.mediaType,
          };
        case "reasoning":
          // Map reasoning as text for now
          return {
            type: "text" as const,
            text: `[Reasoning: ${part.text}]`,
          };
        case "source-url":
          // Map source URLs as text for now
          return {
            type: "text" as const,
            text: `[Source: ${part.url}]`,
          };
        default:
          return {
            type: "text" as const,
            text: "",
          };
      }
    });

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: uiParts,
    } as UIMessage;
  });
}
