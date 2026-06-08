import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";

/**
 * Signal the start of a UI message stream.
 * Must be called before agent.run() when streaming UIMessageChunks.
 */
export async function startStream(messageId: string): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "start",
      messageId,
    });
  } finally {
    writer.releaseLock();
  }
}

/**
 * Signal the end of a UI message stream.
 * Must be called after agent.run() completes to close the stream properly.
 */
export async function finishStream(): Promise<void> {
  "use step";

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: "finish",
      finishReason: "stop",
    });
  } finally {
    writer.releaseLock();
  }

  await writable.close();
}
