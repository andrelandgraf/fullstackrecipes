import { getWritable, getWorkflowMetadata } from "workflow";
import { chatAgent } from "@/lib/ai/chat-agent";
import {
  getMessageHistory,
  persistUserMessage,
  persistAssistantPlaceholder,
  updateAssistantMessage,
} from "./steps/messages";
import { log } from "./steps/logger";
import type { ChatWorkflowInput } from "./types";
import type { MessagePart } from "@/lib/chat/schema";

export async function chatWorkflow({
  chatId,
  userMessage,
}: ChatWorkflowInput): Promise<void> {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await log("info", "Starting chat workflow", { chatId, runId: workflowRunId });

  // Persist the user message
  await persistUserMessage(chatId, userMessage);

  // Create a placeholder for the assistant message with the runId
  const messageId = await persistAssistantPlaceholder(chatId, workflowRunId);

  // Get the full message history
  const history = await getMessageHistory(chatId);

  // Run the agent with streaming
  const { parts } = await chatAgent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  // Convert and persist the assistant message parts
  const persistableParts: MessagePart[] = parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    if (part.type === "reasoning") {
      return { type: "reasoning", reasoning: part.reasoning };
    }
    if (part.type === "tool-invocation") {
      return {
        type: "tool-invocation",
        toolInvocation: part.toolInvocation as MessagePart extends {
          type: "tool-invocation";
        }
          ? MessagePart["toolInvocation"]
          : never,
      };
    }
    if (part.type === "source") {
      return {
        type: "source",
        source: part.source as MessagePart extends { type: "source" }
          ? MessagePart["source"]
          : never,
      };
    }
    return part as MessagePart;
  });

  await updateAssistantMessage(messageId, persistableParts);

  await log("info", "Chat workflow completed", {
    chatId,
    runId: workflowRunId,
    partsCount: parts.length,
  });
}
