import { SimpleChat } from "@/components/simple.chat";
import { getChatMessages } from "@/lib/db/queries";
import { convertDbMessagesToUIMessages } from "@/lib/agent-chat/utils";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat) {
    await db.insert(chats).values({
      id: chatId,
    });
  }

  // Fetch all messages for this chat
  const persistedMessages = await getChatMessages(chatId);

  // Check if the last message is an incomplete assistant message (has runId but no parts)
  // This happens when a workflow was interrupted mid-stream
  const lastMessage = persistedMessages.at(-1);
  const isIncompleteMessage =
    lastMessage?.role === "assistant" &&
    lastMessage?.runId &&
    lastMessage?.parts.length === 0;

  // If incomplete, extract the runId for resumption and remove the empty message from history
  const initialRunId = isIncompleteMessage ? lastMessage.runId : undefined;
  const messagesToConvert = isIncompleteMessage
    ? persistedMessages.slice(0, -1)
    : persistedMessages;

  const history = convertDbMessagesToUIMessages(messagesToConvert);

  return (
    <SimpleChat
      messageHistory={history}
      chatId={chatId}
      initialRunId={initialRunId ?? undefined}
    />
  );
}
