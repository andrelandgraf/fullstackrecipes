import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";

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
