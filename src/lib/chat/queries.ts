import { TOOL_TYPES, type ToolType } from "@/lib/ai/tools";
import {
  isToolPart,
  type ChatAgentUIMessage,
  type ChatToolPart,
} from "@/workflows/chat/types";
import { db } from "@/lib/db/client";
import {
  chats,
  messages,
  messageTexts,
  messageReasoning,
  messageTools,
  messageSourceUrls,
  messageData,
  messageFiles,
  messageSourceDocuments,
  type NewMessageText,
  type NewMessageReasoning,
  type NewMessageTool,
  type NewMessageSourceUrl,
  type NewMessageData,
  type NewMessageFile,
  type NewMessageSourceDocument,
  type Message,
  type MessageText,
  type MessageReasoning,
  type MessageTool,
  type MessageSourceUrl,
  type MessageData,
  type MessageFile,
  type MessageSourceDocument,
} from "./schema";
import { v7 as uuidv7 } from "uuid";
import assert from "@/lib/common/assert";
import { eq, and } from "drizzle-orm";

/**
 * Ensure a chat exists for the given user, creating it if necessary.
 * Returns false if chat exists but belongs to a different user.
 */
export async function ensureChatExists(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const existing = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!existing) {
    await db.insert(chats).values({ id: chatId, userId });
    return true;
  }

  return existing.userId === userId;
}

/**
 * Verify that a chat belongs to a specific user.
 */
export async function verifyChatOwnership(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });
  return !!chat;
}

function parseMetadata(metadata: unknown): any {
  if (!metadata) return undefined;
  if (typeof metadata !== "object") return undefined;
  if (Object.keys(metadata).length === 0) return undefined;
  return metadata;
}

export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): ChatAgentUIMessage[] {
  return messageHistory.map((msg) => {
    const uiParts: ChatAgentUIMessage["parts"] = [];
    uiParts.push({
      type: "step-start",
    });

    for (const part of msg.parts) {
      let uiPart: ChatAgentUIMessage["parts"][0];
      switch (part.type) {
        case "text":
          uiPart = {
            type: "text",
            text: part.text,
            state: "done",
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "tool":
          // Cast needed: TS can't narrow discriminated union from runtime string
          if (part.state === "output-available") {
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-available",
              input: part.input,
              output: part.output,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as ChatToolPart;
          } else if (part.state === "output-error") {
            assert(part.errorText !== null, "Error text is required");
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-error",
              errorText: part.errorText ?? "",
              input: part.input,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as ChatToolPart;
          } else if (part.state === "output-denied") {
            assert(part.approvalId !== null, "Approval ID is required");
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-denied",
              approval: {
                id: part.approvalId,
                approved: false,
                reason: part.approvalReason || "",
              },
              input: part.input,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as ChatToolPart;
          } else {
            throw new Error(`Unknown part state ${part.state}`);
          }
          break;
        case "reasoning":
          uiPart = {
            type: "reasoning",
            text: part.text,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "source-url":
          uiPart = {
            type: "source-url",
            sourceId: part.sourceId,
            url: part.url,
            title: part.title ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "data": {
          if (part.dataType === "data-progress") {
            uiPart = {
              type: "data-progress",
              data: part.data as { text: string },
            };
          } else {
            throw new Error(`Unknown data type: ${part.dataType}`);
          }
          break;
        }
        case "file":
          uiPart = {
            type: "file",
            mediaType: part.mediaType,
            url: part.url,
            filename: part.filename ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        case "source-document":
          uiPart = {
            type: "source-document",
            sourceId: part.sourceId,
            mediaType: part.mediaType,
            title: part.title,
            filename: part.filename ?? undefined,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;
        default:
          throw new Error(`Unknown part ${JSON.stringify(part)}`);
      }
      uiParts.push(uiPart);
    }

    return {
      id: msg.id,
      role: msg.role,
      parts: uiParts,
    };
  });
}

/**
 * Pre-generates UUID v7 IDs to maintain insertion order (parts sorted by ID).
 */
export async function insertMessageParts(
  chatId: string,
  messageId: string,
  parts: ChatAgentUIMessage["parts"],
) {
  const textInserts: Array<NewMessageText> = [];
  const reasoningInserts: Array<NewMessageReasoning> = [];
  const toolInserts: Array<NewMessageTool> = [];
  const sourceUrlInserts: Array<NewMessageSourceUrl> = [];
  const dataInserts: Array<NewMessageData> = [];
  const fileInserts: Array<NewMessageFile> = [];
  const sourceDocumentInserts: Array<NewMessageSourceDocument> = [];

  for (const part of parts) {
    if (part.type === "step-start") {
      continue;
    }

    if (part.type === "text" && "text" in part && part.text.trim()) {
      textInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        text: part.text,
        providerMetadata: part.providerMetadata,
      });
    } else if (
      part.type === "reasoning" &&
      "text" in part &&
      part.text.trim()
    ) {
      reasoningInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        text: part.text,
        providerMetadata: part.providerMetadata,
      });
    } else if (isToolPart(part)) {
      assert(
        TOOL_TYPES.includes(part.type as ToolType),
        `Invalid tool type: ${part.type}. Valid types: ${TOOL_TYPES.join(", ")}`,
      );
      if (part.state === "output-available") {
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: part.input,
          toolCallId: part.toolCallId,
          toolType: part.type,
          callProviderMetadata: part.callProviderMetadata,
          title: part.title,
          providerExecuted: part.providerExecuted,
          output: part.output,
          state: "output-available",
        });
      } else if (part.state === "output-error") {
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: part.input,
          toolCallId: part.toolCallId,
          toolType: part.type,
          callProviderMetadata: part.callProviderMetadata,
          title: part.title,
          providerExecuted: part.providerExecuted,
          errorText: part.errorText,
          state: "output-error",
        });
      } else if (part.state === "output-denied") {
        assert(!!part.approval?.id, "Approval ID is required");
        toolInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          input: part.input,
          toolCallId: part.toolCallId,
          toolType: part.type,
          callProviderMetadata: part.callProviderMetadata,
          title: part.title,
          providerExecuted: part.providerExecuted,
          state: "output-denied",
          approvalId: part.approval?.id,
          approvalReason: part.approval?.reason,
          approved: false,
        });
      }
    } else if (part.type === "source-url") {
      sourceUrlInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        sourceId: part.sourceId,
        url: part.url,
        title: part.title,
        providerMetadata: part.providerMetadata,
      });
    } else if (part.type.startsWith("data-")) {
      if (part.type === "data-progress") {
        dataInserts.push({
          id: uuidv7(),
          messageId,
          chatId,
          dataType: part.type,
          data: part.data,
        });
      } else {
        throw new Error(`Unknown data type ${part.type}`);
      }
    } else if (part.type === "file") {
      fileInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        mediaType: part.mediaType,
        filename: part.filename ?? null,
        url: part.url,
        providerMetadata: part.providerMetadata ?? null,
      });
    } else if (part.type === "source-document") {
      sourceDocumentInserts.push({
        id: uuidv7(),
        messageId,
        chatId,
        sourceId: part.sourceId,
        mediaType: part.mediaType,
        title: part.title,
        filename: part.filename ?? null,
        providerMetadata: part.providerMetadata ?? null,
      });
    }
  }

  const insertPromises = [];

  if (textInserts.length > 0) {
    insertPromises.push(db.insert(messageTexts).values(textInserts));
  }
  if (reasoningInserts.length > 0) {
    insertPromises.push(db.insert(messageReasoning).values(reasoningInserts));
  }
  if (toolInserts.length > 0) {
    insertPromises.push(db.insert(messageTools).values(toolInserts));
  }
  if (sourceUrlInserts.length > 0) {
    insertPromises.push(db.insert(messageSourceUrls).values(sourceUrlInserts));
  }
  if (dataInserts.length > 0) {
    insertPromises.push(db.insert(messageData).values(dataInserts));
  }
  if (fileInserts.length > 0) {
    insertPromises.push(db.insert(messageFiles).values(fileInserts));
  }
  if (sourceDocumentInserts.length > 0) {
    insertPromises.push(
      db.insert(messageSourceDocuments).values(sourceDocumentInserts),
    );
  }

  if (insertPromises.length > 0) {
    await Promise.all(insertPromises);
  }
}

export async function persistMessage({
  chatId,
  message: uiMessage,
  runId,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
  runId?: string | null;
}) {
  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: uiMessage.id || undefined,
      chatId,
      role: uiMessage.role,
      runId: runId || null,
    })
    .returning({ messageId: messages.id });

  await insertMessageParts(chatId, messageId, uiMessage.parts);
}

type MessagePart =
  | ({ type: "text" } & MessageText)
  | ({ type: "reasoning" } & MessageReasoning)
  | ({ type: "tool" } & MessageTool)
  | ({ type: "source-url" } & MessageSourceUrl)
  | ({ type: "data" } & MessageData)
  | ({ type: "file" } & MessageFile)
  | ({ type: "source-document" } & MessageSourceDocument);

export type MessageWithParts = Message & {
  parts: MessagePart[];
};

export async function clearMessageRunId(messageId: string): Promise<void> {
  await db
    .update(messages)
    .set({ runId: null })
    .where(eq(messages.id, messageId));
}

export async function getChatMessages(
  chatId: string,
): Promise<MessageWithParts[]> {
  const [
    messagesData,
    textsData,
    reasoningData,
    toolsData,
    sourceUrlsData,
    dataData,
    filesData,
    sourceDocumentsData,
  ] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    }),
    db.query.messageTexts.findMany({
      where: eq(messageTexts.chatId, chatId),
    }),
    db.query.messageReasoning.findMany({
      where: eq(messageReasoning.chatId, chatId),
    }),
    db.query.messageTools.findMany({
      where: eq(messageTools.chatId, chatId),
    }),
    db.query.messageSourceUrls.findMany({
      where: eq(messageSourceUrls.chatId, chatId),
    }),
    db.query.messageData.findMany({
      where: eq(messageData.chatId, chatId),
    }),
    db.query.messageFiles.findMany({
      where: eq(messageFiles.chatId, chatId),
    }),
    db.query.messageSourceDocuments.findMany({
      where: eq(messageSourceDocuments.chatId, chatId),
    }),
  ]);

  const partsMap = new Map<string, MessagePart[]>();

  function addToMap<T extends { messageId: string }>(
    parts: T[],
    transform: (part: T) => MessagePart,
  ) {
    for (const part of parts) {
      const existing = partsMap.get(part.messageId) || [];
      existing.push(transform(part));
      partsMap.set(part.messageId, existing);
    }
  }

  addToMap(textsData, (part) => ({ ...part, type: "text" as const }));
  addToMap(reasoningData, (part) => ({ ...part, type: "reasoning" as const }));
  addToMap(toolsData, (part) => ({ ...part, type: "tool" as const }));
  addToMap(sourceUrlsData, (part) => ({
    ...part,
    type: "source-url" as const,
  }));
  addToMap(dataData, (part) => ({ ...part, type: "data" as const }));
  addToMap(filesData, (part) => ({ ...part, type: "file" as const }));
  addToMap(sourceDocumentsData, (part) => ({
    ...part,
    type: "source-document" as const,
  }));

  return messagesData.map((message) => {
    const parts = partsMap.get(message.id) || [];
    // UUID v7 IDs are chronologically ordered
    parts.sort((a, b) => a.id.localeCompare(b.id));

    return {
      ...message,
      parts,
    };
  });
}
