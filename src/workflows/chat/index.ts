import { getWritable, getWorkflowMetadata } from "workflow";
import { convertToModelMessages, type UIMessageChunk } from "ai";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage, ChatUIMessagePart } from "./types";
import { runToolLoop } from "@/lib/agents/tool-loop";
import type { ChatWorkflowInput, ChatWorkflowOutput } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  updateAssistantMessage,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { routerStep } from "./steps/router";
import { researchAgentStep } from "./steps/research";
import { draftingAgentStep } from "./steps/drafting";

const MAX_STEPS = 10;

/**
 * Chat Workflow with Router-Based Agent Orchestration
 *
 * This workflow:
 * 1. Persists the user message
 * 2. Creates an empty assistant message with runId (for resumability)
 * 3. Loads full chat history
 * 4. Routes to appropriate agent (research or drafting) based on conversation state
 * 5. Runs the selected agent's tool loop
 * 6. Streams all responses to a single unified stream
 * 7. Updates the assistant message with all parts
 *
 * The router decides:
 * - 'research' → Research agent with Google search
 * - 'drafting' → Drafting agent with character count tool
 */
export async function chatWorkflow({
  chatId,
  userMessage,
}: ChatWorkflowInput): Promise<ChatWorkflowOutput> {
  "use workflow";

  // Get workflow run ID for resumability
  const { workflowRunId } = getWorkflowMetadata();

  // Generate message ID upfront so it's consistent across retries
  const messageId = uuidv7();

  // Step 1: Persist user message
  await persistUserMessage({ chatId, message: userMessage });

  // Step 2: Create empty assistant message with runId for resumability
  await createAssistantMessage({
    chatId,
    messageId,
    runId: workflowRunId,
  });

  // Step 3: Load full message history (now includes user message)
  const history = await getMessageHistory(chatId);

  // Step 4: Router decides which agent to invoke
  const modelMessages = convertToModelMessages(history);
  const { next, reasoning } = await routerStep(modelMessages);
  console.log(`Router: ${next} - ${reasoning}`);

  // Get the workflow's writable stream for UIMessageChunks
  const writable = getWritable<UIMessageChunk>();

  // Step 5: Initialize the stream with messageId in metadata
  await startStream(writable, messageId);

  // Step 6: Run the appropriate agent based on router decision
  const agentStep = next === "research" ? researchAgentStep : draftingAgentStep;
  const { parts: allParts, stepCount } = await runToolLoop<
    ChatAgentUIMessage,
    ChatUIMessagePart
  >(writable, history, agentStep, { maxSteps: MAX_STEPS });

  // Step 7: Finalize the stream
  await finishStream(writable);

  // Step 8: Update assistant message with parts, clear runId
  await updateAssistantMessage({
    chatId,
    messageId,
    parts: allParts,
  });

  return {
    stepCount,
    messageId,
  };
}
