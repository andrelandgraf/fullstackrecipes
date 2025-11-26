import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";

/**
 * Generic result from an agent loop step
 */
export interface AgentStepResult<TMessage extends UIMessage = UIMessage> {
  /** Whether the agent wants to continue (e.g., made tool calls) */
  shouldContinue: boolean;
  /** The response message from this step */
  responseMessage: TMessage;
  /** The finish reason from the LLM */
  finishReason: string;
}

/**
 * Configuration for the tool loop
 */
export interface ToolLoopConfig {
  /** Maximum number of iterations (default: 20) */
  maxSteps?: number;
  /** Callback to persist parts after each iteration */
  onIterationComplete?: (parts: unknown[]) => Promise<void>;
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
 * Takes messages, returns step result.
 * The step function should use getWritable() internally to access the stream.
 */
export type AgentStepFn<TMessage extends UIMessage> = (
  messages: ModelMessage[],
) => Promise<AgentStepResult<TMessage>>;

/**
 * Runs an agent loop that continues while tool calls are made.
 *
 * This loop:
 * 1. Converts UI messages to model messages
 * 2. Executes the agent step function
 * 3. Accumulates message parts from each iteration
 * 4. Calls onIterationComplete callback to persist parts (if provided)
 * 5. Appends responses to message history for multi-turn tool use
 * 6. Continues while shouldContinue is true and under maxSteps
 *
 * @param history - UI message history (will be converted to model messages)
 * @param stepFn - The agent step function to execute each iteration
 * @param config - Optional configuration (maxSteps, onIterationComplete)
 * @returns Accumulated parts and step count
 */
export async function runToolLoop<TMessage extends UIMessage>(
  history: UIMessage[],
  stepFn: AgentStepFn<TMessage>,
  config: ToolLoopConfig = {},
): Promise<ToolLoopResult<TMessage["parts"][number]>> {
  const { maxSteps = 20, onIterationComplete } = config;

  // Convert UI messages to model messages for the LLM
  let modelMessages: ModelMessage[] = convertToModelMessages(history);
  let stepCount = 0;
  let shouldContinue = true;
  let allParts: TMessage["parts"][number][] = [];

  while (shouldContinue && stepCount < maxSteps) {
    // Run one agent iteration
    const result = await stepFn(modelMessages);

    // Get parts from this step
    const stepParts = result.responseMessage
      .parts as TMessage["parts"][number][];

    // Persist parts from this iteration immediately
    if (onIterationComplete) {
      await onIterationComplete(stepParts);
    }

    // Collect parts for return value
    allParts = [...allParts, ...stepParts];

    // Add the response to history for next iteration (if tool calls)
    modelMessages = [
      ...modelMessages,
      ...convertToModelMessages([result.responseMessage]),
    ];

    shouldContinue = result.shouldContinue;
    stepCount++;
  }

  return {
    parts: allParts,
    stepCount,
  };
}
