import { db } from "@/lib/db/client";
import { chats, messages, type Message, type MessagePart } from "./schema";
import { desc, eq, and } from "drizzle-orm";
import type { UIMessage } from "ai";

export async function createChat(userId: string, title?: string) {
  const [chat] = await db
    .insert(chats)
    .values({
      userId,
      title: title ?? "New Chat",
    })
    .returning();

  return chat;
}

export async function getUserChats(userId: string) {
  return db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)],
  });
}

export async function verifyChatOwnership(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  return !!chat;
}

export async function ensureChatExists(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const existingChat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!existingChat) {
    await db.insert(chats).values({
      id: chatId,
      userId,
      title: "New Chat",
    });
    return true;
  }

  return existingChat.userId === userId;
}

export async function getChatMessages(chatId: string): Promise<Message[]> {
  return db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [messages.createdAt],
  });
}

export async function insertMessage(
  chatId: string,
  role: "user" | "assistant",
  parts: MessagePart[],
  runId?: string,
) {
  const [message] = await db
    .insert(messages)
    .values({
      chatId,
      role,
      parts,
      runId,
    })
    .returning();

  return message;
}

export async function updateMessageParts(
  messageId: string,
  parts: MessagePart[],
) {
  await db.update(messages).set({ parts }).where(eq(messages.id, messageId));
}

export function convertDbMessagesToUIMessages(
  dbMessages: Message[],
): UIMessage[] {
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(""),
    parts: msg.parts.map((part) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "reasoning") {
        return { type: "reasoning" as const, reasoning: part.reasoning };
      }
      if (part.type === "tool-invocation") {
        return {
          type: "tool-invocation" as const,
          toolInvocation: part.toolInvocation,
        };
      }
      if (part.type === "source") {
        return { type: "source" as const, source: part.source };
      }
      return part;
    }),
    createdAt: msg.createdAt,
  }));
}
