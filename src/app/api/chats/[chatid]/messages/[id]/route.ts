import { getRun } from "workflow/api";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createUIMessageStreamResponse } from "ai";

/**
 * GET /api/chat/messages/:id
 * SSE endpoint that proxies S2 stream records to the client
 *
 * Params:
 *   - id: message ID (string)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return new Response("Missing id parameter", { status: 400 });
  }

  // Find message to get streamId
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  });

  if (!message) {
    return new Response("Message not found", { status: 404 });
  }

  if (!message.runId) {
    return new Response("Message has no runId", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex =
    startIndexParam !== null ? parseInt(startIndexParam, 10) : undefined;

  const run = await getRun(message.runId);
  const readable = await run.getReadable({ startIndex });
  return createUIMessageStreamResponse({
    stream: readable,
  });
}
