import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";

export interface AgentStepResult<TMessage extends UIMessage = UIMessage> {
  shouldContinue: boolean;
  responseMessage: TMessage;
  finishReason: string;
}

export interface ToolLoopConfig<TPart = unknown> {
  maxSteps?: number;
  onIterationComplete?: (parts: TPart[]) => Promise<void>;
}

export interface ToolLoopResult<TPart> {
  parts: TPart[];
  stepCount: number;
}

export type AgentStepFn<TMessage extends UIMessage> = (
  messages: ModelMessage[],
) => Promise<AgentStepResult<TMessage>>;

/**
 * Executes agent steps in a loop while tool calls are made.
 * Calls onIterationComplete after each step for incremental persistence.
 */
export async function runToolLoop<TMessage extends UIMessage>(
  history: UIMessage[],
  stepFn: AgentStepFn<TMessage>,
  config: ToolLoopConfig<TMessage["parts"][number]> = {},
): Promise<ToolLoopResult<TMessage["parts"][number]>> {
  const { maxSteps = 20, onIterationComplete } = config;

  let modelMessages: ModelMessage[] = convertToModelMessages(history);
  let stepCount = 0;
  let shouldContinue = true;
  let allParts: TMessage["parts"][number][] = [];

  while (shouldContinue && stepCount < maxSteps) {
    const result = await stepFn(modelMessages);
    const stepParts = result.responseMessage.parts;

    if (onIterationComplete) {
      await onIterationComplete(stepParts);
    }

    allParts = [...allParts, ...stepParts];
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
