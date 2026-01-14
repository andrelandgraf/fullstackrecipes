import { getWorkflowMetadata, getWritable } from "workflow";
import type { ChatAgentUIMessage } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
  persistMessageParts,
} from "./steps/history";
import { startStream, finishStream } from "../steps/stream";
import { log } from "./steps/logger";
import { nameChatStep } from "./steps/name-chat";
import { chatAgent } from "@/lib/ai/chat-agent";

/**
 * Main chat workflow that processes user messages and generates AI responses.
 * Uses runId for stream resumability on client reconnection.
 */
export async function chatWorkflow({
  chatId,
  userMessage,
}: {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();

  await log("info", "Starting chat workflow", { chatId, runId: workflowRunId });

  // Persist the user message
  await persistUserMessage({ chatId, message: userMessage });

  // Create a placeholder assistant message with runId for resumability
  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  // Get full message history
  const history = await getMessageHistory(chatId);

  // Start the UI message stream
  await startStream(messageId);

  // Run the agent with streaming
  const { parts } = await chatAgent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  // Persist the assistant message parts
  await persistMessageParts({ chatId, messageId, parts });

  // Finish the UI message stream
  await finishStream();

  // Clear the runId to mark the message as complete
  await removeRunId(messageId);

  // Generate a chat title if this is the first message
  await nameChatStep(chatId, userMessage);

  await log("info", "Chat workflow completed", {
    chatId,
    runId: workflowRunId,
    partsCount: parts.length,
  });
}
