import { getWorkflowMetadata, getWritable } from "workflow";
import type { ChatAgentUIMessage } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
  persistMessageParts,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { writeProgress } from "./steps/progress";
import { log } from "./steps/logger";
import { researchAgent } from "@/lib/ai/research";
import { draftingAgent } from "@/lib/ai/drafting";

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

  await startStream(messageId);

  const { next, reasoning } = await routerStep(chatId, messageId, history);
  await log("info", "Router decision", { next, reasoning });

  const progressText =
    next === "research" ? "Researching topic..." : "Authoring tweet...";
  await writeProgress(progressText, chatId, messageId);

  const agent = next === "research" ? researchAgent : draftingAgent;

  const { parts } = await agent.run(history, {
    maxSteps: 10,
    writable: getWritable(),
  });

  await persistMessageParts({ chatId, messageId, parts });

  await finishStream();

  await removeRunId(messageId);
}
