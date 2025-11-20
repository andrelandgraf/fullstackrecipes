import { Chat } from "@/components/chat";
import { getChatMessages } from "@/lib/db/queries";
import { convertDbMessagesToUIMessages } from "@/lib/agent-chat/utils";

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  // Fetch all messages for this chat
  const messageHistory = await getChatMessages(chatId);

  // Convert to UIMessage format
  const initialMessages = convertDbMessagesToUIMessages(messageHistory);

  // Check if the last message has a streamId - if so, it's still streaming
  const lastMessage = messageHistory.at(-1);
  const initialStreamingMessageId = lastMessage?.runId ? lastMessage.id : null;

  return (
    <Chat
      chatId={chatId}
      initialMessages={initialMessages}
      initialStreamingMessageId={initialStreamingMessageId}
    />
  );
}
