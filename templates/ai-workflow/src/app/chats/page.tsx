import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserChats } from "@/lib/chat/queries";
import { ChatList } from "@/components/chats/chat-list";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/themes/selector";

export const metadata: Metadata = {
  title: "Your Chats",
  description:
    "View and manage your AI conversations. Continue where you left off or start a new chat.",
};

export default async function ChatsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const chats = await getUserChats(session.user.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-lg font-semibold tracking-tight">
              AI Chat
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Chats</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your conversations
          </p>
        </div>

        <ChatList initialChats={chats} />
      </main>
    </div>
  );
}
