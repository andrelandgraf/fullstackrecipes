import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";

/**
 * GET /api/chats/:chatId/messages/:runId/stream
 * Resume endpoint for workflow streams
 * Matches the default WorkflowChatTransport reconnect pattern: ${api}/${runId}/stream
 *
 * Query params:
 *   - startIndex: optional chunk index to resume from
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatid: string; runId: string }> },
) {
  const { runId } = await params;

  if (!runId) {
    return new Response("Missing runId parameter", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const startIndexParam = searchParams.get("startIndex");
  const startIndex =
    startIndexParam !== null ? parseInt(startIndexParam, 10) : undefined;

  const run = await getRun(runId);
  const readable = await run.getReadable({ startIndex });

  return createUIMessageStreamResponse({
    stream: readable,
  });
}
