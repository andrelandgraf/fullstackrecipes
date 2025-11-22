import type { MessageWithParts } from "@/lib/db/queries";
import { saveMessageParts } from "@/lib/db/queries";
import type { ChatAgentUIMessage } from "./agent";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";

/**
 * Convert database messages with parts to ChatAgentUIMessage format
 */
export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): ChatAgentUIMessage[] {
  return messageHistory.map((msg) => {
    // Map database parts to UI message parts
    const uiParts = msg.parts.map((part) => {
      switch (part.type) {
        case "text":
          return {
            type: "text" as const,
            text: part.text,
            state: part.state,
          };
        case "tool":
          // Map to tool-specific type (e.g., "tool-countCharacters")
          const toolPart: any = {
            type: `tool-${part.toolName}` as const,
            toolCallId: part.toolCallId,
            state: part.state,
          };

          // Add input/output from data field
          const data = part.data as any;
          if (data?.input) {
            toolPart.input = data.input;
          }
          if (data?.output) {
            toolPart.output = data.output;
          }

          return toolPart;
        case "reasoning":
          return {
            type: "reasoning" as const,
            text: part.text,
            state: part.state,
          };
        default:
          return {
            type: "text" as const,
            text: "",
            state: "done" as const,
          };
      }
    });

    return {
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: uiParts,
    } as ChatAgentUIMessage;
  });
}

/**
 * Persist UI messages to the database
 * Takes ChatAgentUIMessage array and saves them with their parts
 */
export async function persistMessages({
  chatId,
  messages: uiMessages,
  runId,
}: {
  chatId: string;
  messages: ChatAgentUIMessage[];
  runId?: string | null;
}) {
  for (const uiMessage of uiMessages) {
    // Insert the message record
    // Only include id if it's a valid non-empty string, otherwise let DB generate it
    const [{ messageId }] = await db
      .insert(messages)
      .values({
        ...(uiMessage.id ? { id: uiMessage.id } : {}),
        chatId,
        role: uiMessage.role,
        runId: runId || null,
      })
      .returning({ messageId: messages.id });

    // Extract parts from UI message
    const textParts: string[] = [];
    let textState: "done" | undefined = undefined;
    const reasoningParts: Array<{ text: string; state?: "done" }> = [];
    const toolCalls: Array<any> = [];
    const toolResults: Array<any> = [];

    for (const part of uiMessage.parts) {
      if (part.type === "text" && "text" in part && part.text.trim()) {
        textParts.push(part.text);
        if ("state" in part && part.state === "done") {
          textState = "done";
        }
      } else if (
        part.type === "reasoning" &&
        "text" in part &&
        part.text.trim()
      ) {
        reasoningParts.push({
          text: part.text,
          state: "state" in part && part.state === "done" ? "done" : undefined,
        });
      } else if (part.type.startsWith("tool-") && "toolCallId" in part) {
        // Extract tool name from type (e.g., "tool-countCharacters" -> "countCharacters")
        const toolName = part.type.replace("tool-", "");

        // Extract input - could be named "input" or "args"
        const partAsAny = part as any;
        const input = partAsAny.input ?? partAsAny.args;

        toolCalls.push({
          toolName,
          toolCallId: part.toolCallId,
          input,
          state: partAsAny.state,
        });

        // Add result/output if present
        if (partAsAny.output !== undefined) {
          toolResults.push({
            toolCallId: part.toolCallId,
            output: partAsAny.output,
            state: partAsAny.state ?? "output-available",
          });
        } else if (partAsAny.result !== undefined) {
          toolResults.push({
            toolCallId: part.toolCallId,
            result: partAsAny.result,
            state: partAsAny.state ?? "output-available",
          });
        }
      }
    }

    // Use the shared saveMessageParts function
    await saveMessageParts({
      messageId,
      chatId,
      text: textParts.join("\n"),
      textState,
      reasoning: reasoningParts.length > 0 ? reasoningParts : undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    });
  }
}
