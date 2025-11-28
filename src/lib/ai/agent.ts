import {
  streamText,
  convertToModelMessages,
  type FinishReason,
  type UIMessage,
  type UIMessageChunk,
  type ModelMessage,
} from "ai";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import { researchTools, draftingTools } from "./tools";

type MessagePart = UIMessage["parts"][number];

export type ToolsKey = "research" | "drafting";

const toolSets = {
  research: researchTools,
  drafting: draftingTools,
} as const;

/**
 * Serializable stream options (excludes callbacks like onFinish).
 */
export interface StreamOptions {
  sendStart?: boolean;
  sendFinish?: boolean;
  sendReasoning?: boolean;
  sendSources?: boolean;
}

/**
 * Serializable options for streamText (excludes callbacks and messages).
 */
export interface StepOptions {
  model: string;
  system: string;
  /** Tool set key - resolved to actual tools inside the step executor */
  tools: ToolsKey;
  providerOptions?: ProviderOptions;
}

/**
 * All properties must be serializable for workflow compatibility.
 */
export interface AgentConfig {
  stepOptions: StepOptions;
  streamOptions?: StreamOptions;
}

export interface AgentRunConfig {
  /** @default 20 */
  maxSteps?: number;
  /** Pass getWritable() in workflows, or any WritableStream outside */
  writable?: WritableStream<UIMessageChunk>;
}

export interface AgentRunResult {
  parts: MessagePart[];
  stepCount: number;
}

interface AgentStepResult {
  shouldContinue: boolean;
  responseMessage: UIMessage;
  finishReason: FinishReason;
}

interface StepExecutorConfig {
  stepOptions: StepOptions;
  streamOptions?: StreamOptions;
  writable?: WritableStream<UIMessageChunk>;
}

/**
 * AI agent that executes streamText in a tool loop.
 *
 * Configuration is fully serializable for workflow compatibility.
 * Tools are referenced by key and resolved inside the step executor.
 *
 * @example
 * ```ts
 * const draftingAgent = new Agent({
 *   stepOptions: {
 *     model: "google/gemini-3-pro-preview",
 *     system: "You are a drafting agent...",
 *     tools: "drafting",
 *   },
 *   streamOptions: { sendReasoning: true },
 * });
 *
 * const { parts } = await draftingAgent.run(history, {
 *   maxSteps: 10,
 *   writable: getWritable(),
 * });
 * ```
 */
export class Agent {
  constructor(private config: AgentConfig) {}

  async run(
    history: UIMessage[],
    runConfig: AgentRunConfig = {},
  ): Promise<AgentRunResult> {
    const { maxSteps = 20, writable } = runConfig;

    const stepConfig: StepExecutorConfig = {
      stepOptions: this.config.stepOptions,
      streamOptions: this.config.streamOptions,
      writable,
    };

    let modelMessages: ModelMessage[] = convertToModelMessages(history);
    let stepCount = 0;
    let shouldContinue = true;
    let allParts: MessagePart[] = [];

    while (shouldContinue && stepCount < maxSteps) {
      const result = await executeAgentStep(modelMessages, stepConfig);

      allParts = [...allParts, ...result.responseMessage.parts];
      modelMessages = [
        ...modelMessages,
        ...convertToModelMessages([result.responseMessage]),
      ];

      shouldContinue = result.shouldContinue;
      stepCount++;
    }

    return { parts: allParts, stepCount };
  }
}

/**
 * Step executor with "use step" directive.
 * Separated from class because "use step" only works in standalone functions.
 * @internal
 */
async function executeAgentStep(
  messages: ModelMessage[],
  config: StepExecutorConfig,
): Promise<AgentStepResult> {
  "use step";

  const tools = toolSets[config.stepOptions.tools];

  const resultStream = streamText({
    model: config.stepOptions.model,
    system: config.stepOptions.system,
    tools,
    messages,
    providerOptions: config.stepOptions.providerOptions,
  });

  let responseMessage: UIMessage | null = null;

  const uiStream = resultStream.toUIMessageStream({
    sendStart: config.streamOptions?.sendStart ?? false,
    sendFinish: config.streamOptions?.sendFinish ?? false,
    sendReasoning: config.streamOptions?.sendReasoning ?? false,
    sendSources: config.streamOptions?.sendSources ?? false,
    onFinish: ({ responseMessage: msg }) => {
      responseMessage = msg;
    },
  });

  if (config.writable) {
    await pipeToWritable(uiStream, config.writable);
  } else {
    await consumeStream(uiStream);
  }

  await resultStream.consumeStream();
  const finishReason = await resultStream.finishReason;

  if (!responseMessage) {
    throw new Error("No response message received from stream");
  }

  const shouldContinue = finishReason === "tool-calls";

  return { shouldContinue, responseMessage, finishReason };
}

async function consumeStream<T>(stream: ReadableStream<T>): Promise<void> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

async function pipeToWritable<T>(
  readable: ReadableStream<T>,
  writable: WritableStream<T>,
): Promise<void> {
  const writer = writable.getWriter();
  const reader = readable.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
    }
  } finally {
    reader.releaseLock();
    writer.releaseLock();
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
