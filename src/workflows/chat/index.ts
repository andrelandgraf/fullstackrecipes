import { getWritable, getWorkflowMetadata } from "workflow";
import { convertToModelMessages, type UIMessageChunk, ModelMessage } from "ai";
import { v7 as uuidv7 } from "uuid";
import type { ChatUIMessagePart } from "@/lib/agent-chat/agent";
import type { ChatWorkflowInput, ChatWorkflowOutput } from "./types";
import {
  persistUserMessage,
  createAssistantMessage,
  getMessageHistory,
  updateAssistantMessage,
} from "./steps/history";
import { startStream, finishStream } from "./steps/stream";
import { agentLoopStep } from "./steps/agent";

const MAX_STEPS = 20;

/**
 * Chat Workflow with Custom Agent Loop
 *
 * This workflow:
 * 1. Persists the user message
 * 2. Creates an empty assistant message with runId (for resumability)
 * 3. Loads full chat history
 * 4. Runs an agent loop that can make multiple LLM calls (for tool use)
 * 5. Streams all responses to a single unified stream
 * 6. Updates the assistant message with all parts
 *
 * Each agent loop iteration is a separate step for durability,
 * but they all contribute to ONE assistant message.
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

  // Get the workflow's writable stream for UIMessageChunks
  const writable = getWritable<UIMessageChunk>();

  // Step 4: Initialize the stream with messageId in metadata
  await startStream(writable, messageId);

  // Step 5: Agent loop
  // Convert UI messages to model messages for the LLM
  let modelMessages: ModelMessage[] = convertToModelMessages(history);
  let stepCount = 0;
  let shouldContinue = true;

  // Accumulate all parts from all steps into one message
  const allParts: ChatUIMessagePart[] = [];

  while (shouldContinue && stepCount < MAX_STEPS) {
    // Run one agent iteration
    const result = await agentLoopStep(writable, modelMessages);

    // Collect parts from this step's response
    allParts.push(...(result.responseMessage.parts as ChatUIMessagePart[]));

    // Add the response to history for next iteration (if tool calls)
    modelMessages = [
      ...modelMessages,
      ...convertToModelMessages([result.responseMessage]),
    ];

    shouldContinue = result.shouldContinue;
    stepCount++;
  }

  // Step 6: Finalize the stream
  await finishStream(writable);

  // Step 7: Update assistant message with parts, clear runId
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
