import { convertToModelMessages, readUIMessageStream } from "ai";
import { getChatMessages } from "@/lib/db/queries";
import { convertDbMessagesToUIMessages } from "@/lib/agent-chat/utils";
import { getRun } from "workflow/api";
import { getWorkflowMetadata } from "workflow";

/**
 * Get message history and convert to ModelMessage format
 */
export async function getMessageHistory(chatId: string) {
  "use step";

  // Load message history with parts from database
  const messageHistory = await getChatMessages(chatId);

  // Convert database messages to UIMessage format
  const uiMessages = convertDbMessagesToUIMessages(messageHistory);

  // Convert UIMessages to ModelMessage format for AI SDK
  const coreMessages = convertToModelMessages(uiMessages);

  return coreMessages;
}

/**
 * Persist chat agent response to database
 */
export async function persistChatAgentResponse({
  assistantMessageId,
  chatId,
}: {
  assistantMessageId: string;
  chatId: string;
}) {
  "use step";

  const meta = getWorkflowMetadata();
  const run = await getRun(meta.workflowRunId);
  const readable = await run.readable;

  const i = readUIMessageStream({
    stream: readable,
  });

  //   // Save all message parts to the database from the completed generation
  //   await saveMessageParts({
  //     messageId: assistantMessageId,
  //     chatId,
  //     text: result.text,
  //     reasoning: result.reasoning,
  //     toolCalls: result.toolCalls,
  //     toolResults: result.toolResults,

  //   });

  //   // Clear the streamId to indicate streaming is complete
  //   await db
  //     .update(messages)
  //     .set({
  //       streamId: null,
  //     })
  //     .where(eq(messages.id, assistantMessageId));
  // }
}
