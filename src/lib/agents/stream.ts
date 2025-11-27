import { getWritable } from "workflow";
import type { StreamTextResult, UIMessageChunk, UIMessage } from "ai";

export interface UIStreamOptions {
  sendStart?: boolean;
  sendFinish?: boolean;
  sendReasoning?: boolean;
  sendSources?: boolean;
}

export async function pipeReadableToWritable<T>(
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

export interface StreamToWritableResult<TMessage extends UIMessage> {
  responseMessage: TMessage;
  finishReason: string;
}

/**
 * Pipes streamText result to the workflow's writable stream.
 */
export async function streamToWritable<TMessage extends UIMessage>(
  result: StreamTextResult<any, any>,
  options: UIStreamOptions = {},
): Promise<StreamToWritableResult<TMessage>> {
  const {
    sendStart = false,
    sendFinish = false,
    sendReasoning = false,
    sendSources = false,
  } = options;

  let responseMessage: TMessage | null = null;

  const writable = getWritable<UIMessageChunk>();

  const uiStream = result.toUIMessageStream({
    sendStart,
    sendFinish,
    sendReasoning,
    sendSources,
    onFinish: ({ responseMessage: msg }) => {
      // Cast: AI SDK types callback as UIMessage, but message matches TMessage from same stream
      responseMessage = msg as TMessage;
    },
  });

  await pipeReadableToWritable(uiStream, writable);
  await result.consumeStream();

  const finishReason = await result.finishReason;

  if (!responseMessage) {
    throw new Error("No response message received from stream");
  }

  return {
    responseMessage,
    finishReason,
  };
}
