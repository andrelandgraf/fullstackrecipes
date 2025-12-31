import { db } from "@/lib/db/client";
import { messages, chats, type MessagePart } from "@/lib/chat/schema";
import { eq, desc } from "drizzle-orm";
import type { UIMessage } from "ai";

export async function getMessageHistory(chatId: string): Promise<UIMessage[]> {
  "use step";

  const dbMessages = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [messages.createdAt],
  });

  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant",
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

export async function persistUserMessage(
  chatId: string,
  message: UIMessage,
): Promise<void> {
  "use step";

  const parts: MessagePart[] = message.parts.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    return part as MessagePart;
  });

  await db.insert(messages).values({
    id: message.id,
    chatId,
    role: "user",
    parts,
  });
}

export async function persistAssistantPlaceholder(
  chatId: string,
  runId: string,
): Promise<string> {
  "use step";

  const [inserted] = await db
    .insert(messages)
    .values({
      chatId,
      role: "assistant",
      parts: [],
      runId,
    })
    .returning({ id: messages.id });

  return inserted.id;
}

export async function updateAssistantMessage(
  messageId: string,
  parts: MessagePart[],
): Promise<void> {
  "use step";

  await db.update(messages).set({ parts }).where(eq(messages.id, messageId));
}

export async function updateChatTitle(
  chatId: string,
  title: string,
): Promise<void> {
  "use step";

  await db.update(chats).set({ title }).where(eq(chats.id, chatId));
}

export async function shouldGenerateTitle(chatId: string): Promise<boolean> {
  "use step";

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!chat) return false;

  // Generate title if it's still the default
  if (chat.title !== "New Chat") return false;

  // Check if this is the first exchange
  const messageCount = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    columns: { id: true },
  });

  return messageCount.length <= 2;
}
