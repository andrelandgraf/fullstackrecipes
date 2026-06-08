import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Chat } from "@/components/chat/chat";
import {
  convertDbMessagesToUIMessages,
  ensureChatExists,
  getChatMessages,
} from "@/lib/chat/queries";
import { auth } from "@/lib/auth/server";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";

export const metadata: Metadata = {
  title: "Chat",
  description: "Continue your AI-powered conversation.",
};

interface PageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default async function ChatPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { chatId } = await params;
  const userId = session.user.id;

  const isAuthorized = await ensureChatExists(chatId, userId);
  if (!isAuthorized) {
    redirect("/");
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
    <div className="h-dvh bg-gradient-to-b from-background via-background to-muted/20 grid grid-rows-[auto_1fr]">
      <header className="z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/chats"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only text-sm font-medium">
                Back to chats
              </span>
            </Link>
            <span className="text-border hidden sm:inline">|</span>
            <span className="hidden sm:block font-mono text-lg font-semibold tracking-tight">
              AI Chat
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="min-h-0 overflow-hidden">
        <Chat
          messageHistory={history}
          chatId={chatId}
          initialRunId={initialRunId ?? undefined}
        />
      </main>
    </div>
  );
}
