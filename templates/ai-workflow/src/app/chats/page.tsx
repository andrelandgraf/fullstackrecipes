import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserChats } from "@/lib/chat/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { v7 as uuidv7 } from "uuid";

export default async function ChatsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const chats = await getUserChats(session.user.id);
  const newChatId = uuidv7();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Chats</h1>
        <Button asChild>
          <Link href={`/chats/${newChatId}`}>
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Link>
        </Button>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No chats yet</h2>
          <p className="text-muted-foreground mb-4">
            Start a new conversation to get going.
          </p>
          <Button asChild>
            <Link href={`/chats/${newChatId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Start your first chat
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/chats/${chat.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg truncate">
                    {chat.title ?? "Untitled Chat"}
                  </CardTitle>
                  <CardDescription>
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
