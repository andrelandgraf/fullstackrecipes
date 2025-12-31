import { headers } from "next/headers";
import { verifyChatOwnership, ensureChatExists } from "@/lib/chat/queries";
import { auth } from "@/lib/auth/server";
import { chatWorkflow } from "@/workflows/chat";
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId, message } = (await request.json()) as {
    chatId: string;
    message: ChatAgentUIMessage;
  };

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  // Ensure chat exists (create if needed) and verify ownership
  const isAuthorized = await ensureChatExists(chatId, session.user.id);
  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 });
  }

  // Start workflow with user message
  const run = await start(chatWorkflow, [
    {
      chatId,
      userMessage: message,
    },
  ]);

  // Return stream with runId for resumability
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
