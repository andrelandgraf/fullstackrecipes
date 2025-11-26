import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";
import type { AgentStepResult, UIWritableStream } from "./types";

/**
 * Configuration for the tool loop
 */
export interface ToolLoopConfig {
  /** Maximum number of iterations (default: 20) */
  maxSteps?: number;
}

/**
 * Result from running the tool loop
 */
export interface ToolLoopResult<TPart> {
  /** All accumulated parts from all steps */
  parts: TPart[];
  /** Number of steps executed */
  stepCount: number;
}

/**
 * Agent step function signature.
 * Takes a writable stream and messages, returns step result.
 */
export type AgentStepFn<TMessage extends UIMessage> = (
  writable: UIWritableStream,
  messages: ModelMessage[],
) => Promise<AgentStepResult<TMessage>>;

/**
 * Runs an agent loop that continues while tool calls are made.
 *
 * This loop:
 * 1. Converts UI messages to model messages
 * 2. Executes the agent step function
 * 3. Accumulates message parts from each iteration
 * 4. Appends responses to message history for multi-turn tool use
 * 5. Continues while shouldContinue is true and under maxSteps
 *
 * The loop condition (shouldContinue) is determined by the agent step function,
 * typically based on whether the LLM made tool calls.
 *
 * @param writable - The writable stream to pipe chunks to
 * @param history - UI message history (will be converted to model messages)
 * @param stepFn - The agent step function to execute each iteration
 * @param config - Optional configuration (maxSteps)
 * @returns Accumulated parts and step count
 */
export async function runToolLoop<
  TMessage extends UIMessage,
  TPart = TMessage["parts"][number],
>(
  writable: UIWritableStream,
  history: UIMessage[],
  stepFn: AgentStepFn<TMessage>,
  config: ToolLoopConfig = {},
): Promise<ToolLoopResult<TPart>> {
  const { maxSteps = 20 } = config;

  // Convert UI messages to model messages for the LLM
  let modelMessages: ModelMessage[] = convertToModelMessages(history);
  let stepCount = 0;
  let shouldContinue = true;
  let allParts: TPart[] = [];

  while (shouldContinue && stepCount < maxSteps) {
    console.log("stepCount", stepCount);

    // Run one agent iteration
    const result = await stepFn(writable, modelMessages);

    // Collect parts from this step's response
    allParts = [...allParts, ...(result.responseMessage.parts as TPart[])];

    // Add the response to history for next iteration (if tool calls)
    modelMessages = [
      ...modelMessages,
      ...convertToModelMessages([result.responseMessage]),
    ];

    shouldContinue = result.shouldContinue;
    stepCount++;
  }

  console.log("stepCount", stepCount, "shouldContinue", shouldContinue);

  return {
    parts: allParts,
    stepCount,
  };
}
