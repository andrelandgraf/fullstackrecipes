import { Chat } from "@/components/chat";
import { SimpleChat } from "@/components/simple.chat";
import { getChatMessages } from "@/lib/db/queries";
import { convertDbMessagesToUIMessages } from "@/lib/agent-chat/utils";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats } from "@/lib/db/schema";
import { config } from "@/lib/config";

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
  const history = convertDbMessagesToUIMessages(persistedMessages);

  return <SimpleChat messageHistory={history} chatId={chatId} />;

  // if (!config.flags.enableWorkflowChat) {
  //   return <SimpleChat messageHistory={history} chatId={chatId} />;
  // }
  // // Check if the last message has a streamId - if so, it's still streaming
  // const lastDbMessage = persistedMessages.at(-1);
  // const initialStreamingMessageId = lastDbMessage?.runId
  //   ? lastDbMessage.id
  //   : null;

  // return (
  //   <Chat
  //     chatId={chatId}
  //     messageHistory={history}
  //     initialStreamingMessageId={initialStreamingMessageId}
  //   />
  //);
}
