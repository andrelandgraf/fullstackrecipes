# Chat List & Management

Build a chat list page where users can view, search, rename, and delete their conversations. Modal dialogs are controlled via URL parameters for deep linking.

## Server Actions

Create server actions for chat management operations:

```ts title="src/lib/chat/actions.ts"
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  deleteChat as deleteChatQuery,
  renameChat as renameChatQuery,
} from "./queries";
import { v7 as uuidv7 } from "uuid";

export async function deleteChatAction(chatId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const success = await deleteChatQuery(chatId, session.user.id);

  if (!success) {
    return { error: "Chat not found" };
  }

  revalidatePath("/chats");
  return { success: true };
}

export async function createNewChat() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const chatId = uuidv7();
  redirect(`/chats/${chatId}`);
}

export async function renameChatAction(chatId: string, newTitle: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { error: "Unauthorized" };
  }

  const trimmedTitle = newTitle.trim();
  if (!trimmedTitle) {
    return { error: "Title cannot be empty" };
  }

  const success = await renameChatQuery(chatId, session.user.id, trimmedTitle);

  if (!success) {
    return { error: "Chat not found" };
  }

  revalidatePath("/chats");
  return { success: true, title: trimmedTitle };
}
```

## Chat List Component

The chat list uses nuqs for URL-synced search and modal state:

```tsx title="src/components/chats/chat-list.tsx"
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQueryState, parseAsString } from "nuqs";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Search,
  Trash2,
  Plus,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  deleteChatAction,
  createNewChat,
  renameChatAction,
} from "@/lib/chat/actions";
import { toast } from "sonner";
import type { ChatWithPreview } from "@/lib/chat/queries";

function ChatListItem({
  chat,
  onRequestDelete,
  onRequestRename,
}: {
  chat: ChatWithPreview;
  onRequestDelete: (id: string) => void;
  onRequestRename: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-3 rounded-lg hover:ring-2 hover:ring-primary/50 transition-all">
      <Link
        href={`/chats/${chat.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <MessageSquare className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium truncate text-sm">{chat.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(chat.updatedAt), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {chat.lastMessagePreview || "No messages yet"}
            </p>
            <span className="text-xs text-muted-foreground shrink-0">
              {chat.messageCount} {chat.messageCount === 1 ? "msg" : "msgs"}
            </span>
          </div>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground shrink-0"
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onRequestRename(chat.id)}>
            <Pencil className="size-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onRequestDelete(chat.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ChatList({
  initialChats,
}: {
  initialChats: ChatWithPreview[];
}) {
  const [chats, setChats] = useState(initialChats);
  // URL-synced state for search and modals
  const [searchQuery, setSearchQuery] = useQueryState(
    "q",
    parseAsString.withDefault(""),
  );
  const [deleteId, setDeleteId] = useQueryState("delete", parseAsString);
  const [renameId, setRenameId] = useQueryState("rename", parseAsString);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const chatToDelete = deleteId
    ? chats.find((chat) => chat.id === deleteId)
    : null;

  const chatToRename = renameId
    ? chats.find((chat) => chat.id === renameId)
    : null;

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title.toLowerCase().includes(query) ||
        chat.lastMessagePreview?.toLowerCase().includes(query),
    );
  }, [chats, searchQuery]);

  function handleDelete(id: string) {
    setChats((prev) => prev.filter((chat) => chat.id !== id));
    setDeleteId(null);
  }

  function handleRenameSuccess(id: string, title: string) {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...chat, title } : chat)),
    );
    setRenameId(null);
    setNewTitle("");
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    const result = await deleteChatAction(deleteId);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      handleDelete(deleteId);
      toast.success("Chat deleted");
      setIsDeleting(false);
    }
  }

  async function handleConfirmRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameId || !newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    setIsRenaming(true);
    const result = await renameChatAction(renameId, newTitle);
    setIsRenaming(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      handleRenameSuccess(renameId, result.title!);
      toast.success("Chat renamed");
    }
  }

  function handleRequestRename(id: string) {
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      setNewTitle(chat.title);
      setRenameId(id);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value || null);
  }

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MessageSquare className="size-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No chats yet</h3>
        <p className="text-muted-foreground mt-1">
          Start a new conversation to get going
        </p>
        <form action={createNewChat} className="mt-4">
          <Button type="submit" className="gap-2">
            <Plus className="size-4" />
            Start a Chat
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <form action={createNewChat}>
          <Button type="submit" className="gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            New Chat
          </Button>
        </form>
      </div>

      {filteredChats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No chats found</h3>
          <p className="text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              onRequestDelete={setDeleteId}
              onRequestRename={handleRequestRename}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation - URL: ?delete=chatId */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{chatToDelete?.title}&quot; and
              all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog - URL: ?rename=chatId */}
      <Dialog
        open={!!renameId}
        onOpenChange={(open) => {
          if (!open) {
            setRenameId(null);
            setNewTitle("");
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleConfirmRename}>
            <DialogHeader>
              <DialogTitle>Rename chat</DialogTitle>
              <DialogDescription>
                Enter a new name for &quot;{chatToRename?.title}&quot;.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="chat-title" className="sr-only">
                Chat title
              </Label>
              <Input
                id="chat-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Chat title"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenameId(null);
                  setNewTitle("");
                }}
                disabled={isRenaming}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## Chats Page

Create a protected page that fetches and displays the user's chats:

```tsx title="src/app/chats/page.tsx"
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/server";
import { getUserChats } from "@/lib/chat/queries";
import { ChatList } from "@/components/chats/chat-list";

export const metadata: Metadata = {
  title: "Your Chats",
  description: "View and manage your AI conversations.",
  alternates: {
    canonical: "/chats",
  },
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
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Chats</h1>
        <p className="text-muted-foreground mt-1">
          View and manage your conversations
        </p>
      </div>

      <ChatList initialChats={chats} />
    </main>
  );
}
```

## Deep Linkable URLs

The chat list supports these deep links:

- `/chats` - Default view
- `/chats?q=react` - Search for "react"
- `/chats?delete=abc123` - Open delete dialog for chat abc123
- `/chats?rename=abc123` - Open rename dialog for chat abc123
- `/chats?q=react&delete=abc123` - Combined search and delete dialog

Users can share these URLs or bookmark specific actions. Browser back/forward navigation preserves the UI state.
