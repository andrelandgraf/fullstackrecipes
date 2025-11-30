import { headers } from "next/headers";
import { getRun } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import { auth } from "@/lib/auth/server";
import { verifyChatOwnership } from "@/lib/chat/queries";

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
  { params }: { params: Promise<{ chatId: string; runId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId, runId } = await params;

  if (!runId) {
    return new Response("Missing runId parameter", { status: 400 });
  }

  const isAuthorized = await verifyChatOwnership(chatId, session.user.id);
  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 });
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
