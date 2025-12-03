"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  onDelete,
  onRename,
}: {
  chat: ChatWithPreview;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTitle, setNewTitle] = useState(chat.title);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteChatAction(chat.id);
    if (result.error) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      onDelete(chat.id);
      toast.success("Chat deleted");
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    setIsRenaming(true);
    const result = await renameChatAction(chat.id, newTitle);
    setIsRenaming(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      onRename(chat.id, result.title!);
      setShowRenameDialog(false);
      toast.success("Chat renamed");
    }
  }

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
            disabled={isDeleting || isRenaming}
          >
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setShowRenameDialog(true)}>
            <Pencil className="size-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename chat</DialogTitle>
              <DialogDescription>
                Enter a new name for this chat.
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
                onClick={() => setShowRenameDialog(false)}
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ChatList({
  initialChats,
}: {
  initialChats: ChatWithPreview[];
}) {
  const [chats, setChats] = useState(initialChats);
  const [searchQuery, setSearchQuery] = useState("");

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
  }

  function handleRename(id: string, newTitle: string) {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === id ? { ...chat, title: newTitle } : chat,
      ),
    );
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      )}
    </div>
  );
}
