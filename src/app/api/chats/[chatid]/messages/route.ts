import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { chatWorkflow } from "@/workflows/chat";
import { eq } from "drizzle-orm";
import { start } from "workflow/api";
import { createUIMessageStreamResponse } from "ai";
import type { ChatAgentUIMessage } from "@/workflows/chat/types";

export async function POST(request: Request) {
  const { chatId, message } = (await request.json()) as {
    chatId: string;
    message: ChatAgentUIMessage;
  };

  if (!chatId || !message) {
    return new Response("Missing chatId or message", { status: 400 });
  }

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  // Start workflow with user message
  // User message persistence and assistant message creation happen inside the workflow
  const run = await start(chatWorkflow, [
    {
      chatId,
      userMessage: message,
    },
  ]);

  // Return stream - runId is all the client needs for resumability
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
