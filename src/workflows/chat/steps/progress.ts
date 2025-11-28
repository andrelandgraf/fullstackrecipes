import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";
import type { ChatDataProgressPart } from "../types";
import { insertMessageParts } from "@/lib/db/queries/chat";

/** Writes a progress update to both the stream and database. */
export async function writeProgress(
  text: string,
  chatId: string,
  messageId: string,
): Promise<void> {
  "use step";

  const progressPart: ChatDataProgressPart = {
    type: "data-progress",
    data: {
      text,
    },
  };

  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write(progressPart);
  } finally {
    writer.releaseLock();
  }

  await insertMessageParts(chatId, messageId, [progressPart]);
}
