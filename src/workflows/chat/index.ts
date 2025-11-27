import { getWorkflowMetadata } from "workflow";
import type { ModelMessage } from "ai";
import type { ChatAgentUIMessage } from "./types";
import { runToolLoop } from "@/lib/agents/tool-loop";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
  persistMessageParts,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { researchAgentStep } from "./steps/research";
import { draftingAgentStep } from "./steps/drafting";

/**
 * Main chat workflow that routes between research and drafting agents.
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

  await persistUserMessage({ chatId, message: userMessage });

  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  const history = await getMessageHistory(chatId);

  const { next, reasoning } = await routerStep(chatId, messageId, history);
  console.log(`Router: ${next} - ${reasoning}`);

  await startStream(messageId);

  const agentStep =
    next === "research"
      ? (messages: ModelMessage[]) =>
          researchAgentStep(chatId, messageId, messages)
      : (messages: ModelMessage[]) =>
          draftingAgentStep(chatId, messageId, messages);

  await runToolLoop<ChatAgentUIMessage>(history, agentStep, {
    maxSteps: 10,
    onIterationComplete: (parts) =>
      persistMessageParts({ chatId, messageId, parts }),
  });

  await finishStream();

  await removeRunId(messageId);
}
