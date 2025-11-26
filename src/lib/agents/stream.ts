import { getWritable } from "workflow";
import type { StreamTextResult, UIMessageChunk, UIMessage } from "ai";

/**
 * Configuration for converting streamText to UI stream
 */
export interface UIStreamOptions {
  /** Send start message chunk (default: true) */
  sendStart?: boolean;
  /** Send finish message chunk (default: true) */
  sendFinish?: boolean;
  /** Include reasoning in stream (default: false) */
  sendReasoning?: boolean;
  /** Include sources in stream (default: false) */
  sendSources?: boolean;
}

/**
 * Pipes a ReadableStream to a WritableStream with proper lock management.
 *
 * Acquires a writer from the writable, reads all chunks from the readable,
 * and writes them to the writable. Properly releases locks when done.
 *
 * @param readable - The source stream to read from
 * @param writable - The destination stream to write to
 */
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

/**
 * Result from streaming to a writable
 */
export interface StreamToWritableResult<TMessage extends UIMessage> {
  /** The response message captured from the stream */
  responseMessage: TMessage;
  /** The finish reason from the LLM (e.g., "stop", "tool-calls") */
  finishReason: string;
}

/**
 * Converts a streamText result to UI message stream and pipes it to the workflow's writable.
 *
 * This handles:
 * - Converting the streamText result to a UI message stream
 * - Piping all chunks to the workflow's writable stream (obtained via getWritable())
 * - Consuming the stream to trigger onFinish callbacks
 * - Capturing the response message and finish reason
 *
 * @param result - The streamText result from AI SDK
 * @param options - UI stream options (sendStart, sendFinish, etc.)
 * @returns The response message and finish reason
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

  // Get the workflow's writable stream
  const writable = getWritable<UIMessageChunk>();

  // Convert to UI message stream
  const uiStream = result.toUIMessageStream({
    sendStart,
    sendFinish,
    sendReasoning,
    sendSources,
    onFinish: ({ responseMessage: msg }) => {
      responseMessage = msg as TMessage;
    },
  });

  // Pipe the UI stream to the writable
  await pipeReadableToWritable(uiStream, writable);

  // Ensure the result stream is fully consumed (triggers onFinish callbacks)
  await result.consumeStream();

  // Get the finish reason
  const finishReason = await result.finishReason;

  if (!responseMessage) {
    throw new Error("No response message received from stream");
  }

  return {
    responseMessage,
    finishReason,
  };
}
