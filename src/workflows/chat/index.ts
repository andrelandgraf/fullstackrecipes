import { getWorkflowMetadata } from "workflow";
import type { ModelMessage } from "ai";
import type { ChatAgentUIMessage, ChatUIMessagePart } from "./types";
import { runToolLoop } from "@/lib/agents/tool-loop";
import { insertMessageParts } from "@/lib/db/messages";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  removeRunId,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { researchAgentStep } from "./steps/research";
import { draftingAgentStep } from "./steps/drafting";

/**
 * Chat Workflow with Router-Based Agent Orchestration
 *
 * This workflow:
 * 1. Persists the user message
 * 2. Creates an empty assistant message with runId (for resumability)
 * 3. Loads full chat history
 * 4. Routes to appropriate agent (research or drafting) based on conversation state
 * 5. Runs the selected agent's tool loop with **incremental persistence**
 * 6. Streams all responses to a single unified stream
 * 7. Clears the runId to mark completion
 *
 * **Incremental Persistence:**
 * Parts are persisted as early as possible:
 * - Progress updates are persisted immediately when emitted
 * - Agent response parts are persisted after each tool loop iteration
 *
 * The router decides:
 * - 'research' → Research agent with Google search
 * - 'drafting' → Drafting agent with character count tool
 */
export async function chatWorkflow({
  chatId,
  userMessage,
}: {
  chatId: string;
  userMessage: ChatAgentUIMessage;
}) {
  "use workflow";

  // Get workflow run ID for resumability
  const { workflowRunId } = getWorkflowMetadata();

  // Step 1: Persist user message
  await persistUserMessage({ chatId, message: userMessage });

  // Step 2: Create empty assistant message with runId for resumability
  const messageId = await createAssistantMessage({
    chatId,
    runId: workflowRunId,
  });

  // Step 3: Load full message history (now includes user message)
  const history = await getMessageHistory(chatId);

  // Step 4: Router decides which agent to invoke
  const { next, reasoning } = await routerStep(chatId, messageId, history);
  console.log(`Router: ${next} - ${reasoning}`);

  // Step 5: Initialize the stream with messageId in metadata
  await startStream(messageId);

  // Step 6: Select agent step based on router decision
  const agentStep =
    next === "research"
      ? (messages: ModelMessage[]) =>
          researchAgentStep(chatId, messageId, messages)
      : (messages: ModelMessage[]) =>
          draftingAgentStep(chatId, messageId, messages);

  // Step 7: Run the agent loop with incremental persistence
  await runToolLoop<ChatAgentUIMessage>(history, agentStep, {
    maxSteps: 10,
    onIterationComplete: async (parts) => {
      await insertMessageParts(chatId, messageId, parts as ChatUIMessagePart[]);
    },
  });

  // Step 8: Finalize the stream
  await finishStream();

  // Step 9: Clear runId to mark workflow complete (parts already persisted)
  await removeRunId(messageId);
}
