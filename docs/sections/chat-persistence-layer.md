## Chat Persistence Layer

The persistence layer handles converting between AI SDK's `UIMessage` format and your database tables. This includes type definitions, query helpers, and persistence functions.

### Chat Types

Create `src/lib/chat/types.ts` to define types that extend AI SDK's base types with your tools and data parts:

```typescript
import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools } from "@/lib/ai/tools";

const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

// Data parts allow streaming custom structured data to the client.
// Use dataStream.writeData({ type: "data-progress", data: { text: "..." } })
// in your API route to stream progress updates during long operations.
const dataPartSchema = z.object({
  progress: z.object({
    text: z.string(),
  }),
});
export type ChatDataPart = z.infer<typeof dataPartSchema>;

export type ChatToolSet = InferUITools<typeof allTools>;

export type ChatAgentUIMessage = UIMessage<
  ChatMetadata,
  ChatDataPart,
  ChatToolSet
>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;

// Type guards and extracted part types
export type ChatTextPart = Extract<ChatUIMessagePart, { type: "text" }>;
export type ChatReasoningPart = Extract<
  ChatUIMessagePart,
  { type: "reasoning" }
>;
export type ChatSourceUrlPart = Extract<
  ChatUIMessagePart,
  { type: "source-url" }
>;
export type ChatToolPart = Extract<
  ChatUIMessagePart,
  { type: `tool-${string}` }
>;
export type ChatDataProgressPart = Extract<
  ChatUIMessagePart,
  { type: "data-progress" }
>;
export type ChatFilePart = Extract<ChatUIMessagePart, { type: "file" }>;

export function isToolPart(part: ChatUIMessagePart): part is ChatToolPart {
  return part.type.startsWith("tool-");
}

export function isDataProgressPart(
  part: ChatUIMessagePart,
): part is ChatDataProgressPart {
  return part.type === "data-progress";
}
```

### Tool Definitions

Define your tools with their schemas. This example creates a character counter for tweet drafting:

```typescript
// src/lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const allTools = {
  countCharacters: tool({
    description: "Count characters in text. Use to verify tweet length.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }) => {
      const count = text.length;
      const remaining = 280 - count;
      return {
        characterCount: count,
        remainingCharacters: remaining,
        isWithinLimit: count <= 280,
        status:
          count <= 280
            ? `${count}/280 characters (${remaining} remaining)`
            : `${count}/280 characters (${Math.abs(remaining)} over limit)`,
      };
    },
  }),
};

// Tool type names for database schema - must match keys as "tool-{key}"
export const TOOL_TYPES = ["tool-countCharacters"] as const;
export type ToolType = (typeof TOOL_TYPES)[number];
```

The `TOOL_TYPES` array must match your tool keys prefixed with `tool-` for the database schema's enum constraint.

### Assertion Helper

A simple utility used throughout the persistence layer:

```typescript
// src/lib/common/assert.ts
const prefix = "Assertion failed";

export default function assert(
  condition: unknown,
  message?: string | (() => string),
): asserts condition {
  if (condition) return;

  const provided = typeof message === "function" ? message() : message;
  throw new Error(provided ? `${prefix}: ${provided}` : prefix);
}
```

### Query Helpers

Create `src/lib/chat/queries.ts` with functions to persist and retrieve messages:

```typescript
import { TOOL_TYPES, type ToolType } from "@/lib/ai/tools";
import {
  isToolPart,
  type ChatAgentUIMessage,
  type ChatToolPart,
} from "./types";
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
import { eq } from "drizzle-orm";

/**
 * Ensure a chat exists, creating it if necessary.
 */
export async function ensureChatExists(chatId: string): Promise<void> {
  const existing = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  if (!existing) {
    await db.insert(chats).values({ id: chatId });
  }
}
```

### Message Part Insertion

Pre-generate UUID v7 IDs to maintain insertion order:

```typescript
function parseMetadata(metadata: unknown): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  if (typeof metadata !== "object") return undefined;
  if (Object.keys(metadata).length === 0) return undefined;
  return metadata as Record<string, unknown>;
}

export async function insertMessageParts(
  chatId: string,
  messageId: string,
  parts: ChatAgentUIMessage["parts"],
) {
  const textInserts: NewMessageText[] = [];
  const reasoningInserts: NewMessageReasoning[] = [];
  const toolInserts: NewMessageTool[] = [];
  const sourceUrlInserts: NewMessageSourceUrl[] = [];
  const dataInserts: NewMessageData[] = [];
  const fileInserts: NewMessageFile[] = [];
  const sourceDocumentInserts: NewMessageSourceDocument[] = [];

  for (const part of parts) {
    if (part.type === "step-start") continue;

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
        `Invalid tool type: ${part.type}`,
      );

      const base = {
        id: uuidv7(),
        messageId,
        chatId,
        input: part.input,
        toolCallId: part.toolCallId,
        toolType: part.type,
        callProviderMetadata: part.callProviderMetadata,
        title: part.title,
        providerExecuted: part.providerExecuted,
      };

      if (part.state === "output-available") {
        toolInserts.push({
          ...base,
          output: part.output,
          state: "output-available",
        });
      } else if (part.state === "output-error") {
        toolInserts.push({
          ...base,
          errorText: part.errorText,
          state: "output-error",
        });
      } else if (part.state === "output-denied") {
        assert(part.approval?.id, "Approval ID required for denied tools");
        toolInserts.push({
          ...base,
          state: "output-denied",
          approvalId: part.approval.id,
          approvalReason: part.approval.reason,
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

  // Insert all parts in parallel
  const insertPromises = [];
  if (textInserts.length)
    insertPromises.push(db.insert(messageTexts).values(textInserts));
  if (reasoningInserts.length)
    insertPromises.push(db.insert(messageReasoning).values(reasoningInserts));
  if (toolInserts.length)
    insertPromises.push(db.insert(messageTools).values(toolInserts));
  if (sourceUrlInserts.length)
    insertPromises.push(db.insert(messageSourceUrls).values(sourceUrlInserts));
  if (dataInserts.length)
    insertPromises.push(db.insert(messageData).values(dataInserts));
  if (fileInserts.length)
    insertPromises.push(db.insert(messageFiles).values(fileInserts));
  if (sourceDocumentInserts.length)
    insertPromises.push(
      db.insert(messageSourceDocuments).values(sourceDocumentInserts),
    );

  if (insertPromises.length) await Promise.all(insertPromises);
}

export async function persistMessage({
  chatId,
  message: uiMessage,
}: {
  chatId: string;
  message: ChatAgentUIMessage;
}) {
  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: uiMessage.id || undefined,
      chatId,
      role: uiMessage.role,
    })
    .returning({ messageId: messages.id });

  await insertMessageParts(chatId, messageId, uiMessage.parts);
}
```

### Fetching Messages

Fetch all parts in parallel and reconstruct messages:

```typescript
type MessagePart =
  | ({ type: "text" } & MessageText)
  | ({ type: "reasoning" } & MessageReasoning)
  | ({ type: "tool" } & MessageTool)
  | ({ type: "source-url" } & MessageSourceUrl)
  | ({ type: "data" } & MessageData)
  | ({ type: "file" } & MessageFile)
  | ({ type: "source-document" } & MessageSourceDocument);

export type MessageWithParts = Message & { parts: MessagePart[] };

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
    db.query.messageTexts.findMany({ where: eq(messageTexts.chatId, chatId) }),
    db.query.messageReasoning.findMany({
      where: eq(messageReasoning.chatId, chatId),
    }),
    db.query.messageTools.findMany({ where: eq(messageTools.chatId, chatId) }),
    db.query.messageSourceUrls.findMany({
      where: eq(messageSourceUrls.chatId, chatId),
    }),
    db.query.messageData.findMany({ where: eq(messageData.chatId, chatId) }),
    db.query.messageFiles.findMany({ where: eq(messageFiles.chatId, chatId) }),
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

  addToMap(textsData, (part) => ({ ...part, type: "text" }));
  addToMap(reasoningData, (part) => ({ ...part, type: "reasoning" }));
  addToMap(toolsData, (part) => ({ ...part, type: "tool" }));
  addToMap(sourceUrlsData, (part) => ({ ...part, type: "source-url" }));
  addToMap(dataData, (part) => ({ ...part, type: "data" }));
  addToMap(filesData, (part) => ({ ...part, type: "file" }));
  addToMap(sourceDocumentsData, (part) => ({
    ...part,
    type: "source-document",
  }));

  return messagesData.map((message) => {
    const parts = partsMap.get(message.id) || [];
    // UUID v7 IDs are chronologically ordered
    parts.sort((a, b) => a.id.localeCompare(b.id));
    return { ...message, parts };
  });
}
```

### Converting to UI Messages

Transform database records back to AI SDK format:

```typescript
export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): ChatAgentUIMessage[] {
  return messageHistory.map((msg) => {
    const uiParts: ChatAgentUIMessage["parts"] = [{ type: "step-start" }];

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

        case "reasoning":
          uiPart = {
            type: "reasoning",
            text: part.text,
            providerMetadata: parseMetadata(part.providerMetadata),
          };
          break;

        case "tool":
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
            assert(part.errorText !== null, "Error text required");
            uiPart = {
              type: part.toolType,
              toolCallId: part.toolCallId,
              state: "output-error",
              errorText: part.errorText,
              input: part.input,
              callProviderMetadata: parseMetadata(part.callProviderMetadata),
            } as ChatToolPart;
          } else if (part.state === "output-denied") {
            assert(part.approvalId !== null, "Approval ID required");
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
            throw new Error(`Unknown tool state: ${part.state}`);
          }
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

        case "data":
          if (part.dataType === "data-progress") {
            uiPart = {
              type: "data-progress",
              data: part.data as { text: string },
            };
          } else {
            throw new Error(`Unknown data type: ${part.dataType}`);
          }
          break;

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
          throw new Error(`Unknown part: ${JSON.stringify(part)}`);
      }

      uiParts.push(uiPart);
    }

    return { id: msg.id, role: msg.role, parts: uiParts };
  });
}
```
