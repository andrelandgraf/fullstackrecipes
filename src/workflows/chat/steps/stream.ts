import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";

/**
 * Initialize the stream with start event
 * This is called once at the beginning of the workflow
 */
export async function startStream(messageId: string): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "start",
      messageMetadata: {
        messageId,
      },
    } satisfies UIMessageChunk);
  } finally {
    writer.releaseLock();
  }
}

/**
 * Finalize the stream with finish event and close it
 * This is called once at the end of the workflow
 */
export async function finishStream(): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "finish",
      finishReason: "stop",
    } satisfies UIMessageChunk);
  } finally {
    writer.releaseLock();
  }

  // Close the stream to signal completion
  await writable.close();
}
