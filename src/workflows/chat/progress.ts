import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";
import type { ChatDataProgressPart } from "./types";
import { insertMessageParts } from "@/lib/db/messages";

/**
 * Write a progress update to the stream AND persist it to the database.
 *
 * Progress parts are:
 * 1. Written immediately to the stream (for real-time UI updates)
 * 2. Persisted immediately to the database (for resumability)
 *
 * @param text - The progress message to display
 * @param chatId - Chat ID for persistence
 * @param messageId - Message ID for persistence
 */
export async function writeProgress(
  text: string,
  chatId: string,
  messageId: string,
): Promise<void> {
  const progressPart: ChatDataProgressPart = {
    type: "data-progress",
    data: {
      text,
    },
  };

  // Write to stream for real-time UI
  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write(progressPart);
  } finally {
    writer.releaseLock();
  }

  // Persist to database
  await insertMessageParts(chatId, messageId, [progressPart]);
}
