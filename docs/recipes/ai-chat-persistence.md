### Prerequisites

- Completed [Neon + Drizzle Setup](/recipes/neon-drizzle-setup)
- Install additional packages:

```bash
bun add uuid zod
bun add -D @types/uuid
```

### Why UUID v7?

UUID v7 encodes a Unix timestamp in its first 48 bits, making IDs lexicographically ordered by creation time:

```typescript
import { v7 as uuidv7 } from "uuid";

const id = uuidv7(); // e.g., "019012c5-7f3a-7000-8000-000000000000"
```

This enables:

- **Message ordering** - Sort by ID instead of requiring a separate `createdAt` index
- **Part ordering** - Message parts (text, reasoning, tools) maintain insertion order when sorted by ID
- **Efficient queries** - UUID v7 primary keys serve as natural sort keys

### Enable UUID v7 in Postgres

Before creating tables, enable the `pg_uuidv7` extension:

```sql
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
```

> **Note**: Postgres 18+ includes native UUID v7 support via `uuidv7()`. Update your schema to use `uuidv7()` instead of `uuid_generate_v7()` when available.

### Schema Definition

Create the chat database schema:

```typescript
// src/lib/chat/schema.ts
import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const chats = pgTable("chats", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

Using `ON DELETE CASCADE` ensures all related records are automatically deleted when a chat is removed.

### Message Part Tables

AI SDK messages contain multiple part types. Each gets its own table for efficient querying and parallel insertion:

```typescript
// Text content parts
export const messageTexts = pgTable("message_texts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reasoning/thinking parts (for models with extended thinking)
export const messageReasoning = pgTable("message_reasoning", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tool invocation parts
export const messageTools = pgTable("message_tools", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  title: text("title"),
  toolCallId: text("tool_call_id").notNull(),
  providerExecuted: boolean("provider_executed").notNull().default(false),
  errorText: text("error_text"),
  input: jsonb("input").notNull(),
  output: jsonb("output"),
  // Must match tool keys from your tools definition as "tool-{key}"
  toolType: text("tool_type", {
    enum: ["tool-countCharacters"], // Add your tool types here
  }).notNull(),
  state: text("state", {
    enum: ["output-available", "output-error", "output-denied"],
  })
    .notNull()
    .default("output-available"),
  callProviderMetadata: jsonb("call_provider_metadata"),
  approvalId: text("approval_id"),
  approvalReason: text("approval_reason"),
  approved: boolean("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Source URL citation parts
export const messageSourceUrls = pgTable("message_source_urls", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Custom data parts (progress updates, structured data)
export const messageData = pgTable("message_data", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  dataType: text("data_type").notNull(), // data-progress, data-weather, etc.
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// File attachment parts
export const messageFiles = pgTable("message_files", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  mediaType: text("media_type").notNull(), // IANA media type (image/png, application/pdf)
  filename: text("filename"),
  url: text("url").notNull(), // Data URL or regular URL
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Source document citation parts
export const messageSourceDocuments = pgTable("message_source_documents", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  sourceId: text("source_id").notNull(),
  mediaType: text("media_type").notNull(),
  title: text("title").notNull(),
  filename: text("filename"),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Type Exports

Add type exports at the end of your schema file:

```typescript
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type MessageText = typeof messageTexts.$inferSelect;
export type NewMessageText = typeof messageTexts.$inferInsert;
export type MessageReasoning = typeof messageReasoning.$inferSelect;
export type NewMessageReasoning = typeof messageReasoning.$inferInsert;
export type MessageTool = typeof messageTools.$inferSelect;
export type NewMessageTool = typeof messageTools.$inferInsert;
export type MessageSourceUrl = typeof messageSourceUrls.$inferSelect;
export type NewMessageSourceUrl = typeof messageSourceUrls.$inferInsert;
export type MessageData = typeof messageData.$inferSelect;
export type NewMessageData = typeof messageData.$inferInsert;
export type MessageFile = typeof messageFiles.$inferSelect;
export type NewMessageFile = typeof messageFiles.$inferInsert;
export type MessageSourceDocument = typeof messageSourceDocuments.$inferSelect;
export type NewMessageSourceDocument =
  typeof messageSourceDocuments.$inferInsert;
```

### Re-export from Central Schema

Update the central schema file:

```typescript
// src/lib/db/schema.ts
export * from "@/lib/chat/schema";
```

### Generate and Run Migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Design Decisions

### Separate Tables vs JSONB

Message parts are stored in separate tables rather than a single JSONB column:

- **Efficient queries** - Query specific part types without scanning all messages
- **Parallel insertion** - Different part types can be inserted concurrently
- **Indexing** - Add indexes on specific columns (e.g., `toolType`, `sourceId`)
- **Type safety** - Drizzle provides full type inference for each table

### chatId on Part Tables

Each part table includes a `chatId` column even though it could be derived through `messageId`:

- **Query efficiency** - Fetch all parts for a chat in one query without joins
- **Cascade deletes** - Both message and chat deletions cascade correctly
- **Index usage** - Filter by chat without touching the messages table

---

## Chat Persistence Layer

The persistence layer handles converting between AI SDK's `UIMessage` format and your database tables. This includes type definitions, query helpers, and persistence functions.

### Prerequisites

- Completed [Assertion Helper](/recipes/assert) setup

### Chat Types

Define types that extend AI SDK's base types with your tools and data parts:

```typescript
// src/lib/chat/types.ts
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

### Query Helpers

Create functions to persist and retrieve messages:

```typescript
// src/lib/chat/queries.ts
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

---

## API Route with Persistence

The API route handles streaming AI responses while persisting messages to the database. User messages are saved before streaming; assistant messages are saved via the `onFinish` callback.

### Route Handler

Create the chat route handler:

```typescript
// src/app/api/chats/[chatId]/route.ts
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { ChatAgentUIMessage } from "@/lib/chat/types";
import { allTools } from "@/lib/ai/tools";
import {
  ensureChatExists,
  persistMessage,
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

const systemPrompt = `You are a tweet drafting assistant. Help users craft 
engaging tweets within 280 characters. Use the countCharacters tool to verify 
length before presenting final drafts. Offer variations and explain your 
reasoning for word choices.`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const { message }: { message: ChatAgentUIMessage } = await req.json();

  // Ensure chat exists before persisting messages
  await ensureChatExists(chatId);

  // Persist user message before streaming
  await persistMessage({ chatId, message });

  // Load full conversation history from database
  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  const result = streamText({
    model: "google/gemini-2.5-pro-preview-05-06",
    system: systemPrompt,
    messages: await convertToModelMessages(history),
    tools: allTools,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse({
    onFinish: async ({ responseMessage }) => {
      // Persist assistant response after streaming completes
      await persistMessage({
        chatId,
        message: responseMessage as ChatAgentUIMessage,
      });
    },
  });
}
```

### Key Points

**Server-Side History Loading**

The API loads full history from the database rather than trusting client-sent messages:

- Single source of truth for conversation state
- Prevents message tampering or injection
- Client only sends the latest user message

**Persistence Order**

1. User message is persisted immediately (before streaming)
2. Assistant message is persisted in `onFinish` (after streaming completes)

This ensures messages are saved even if the user closes the tab mid-stream.

**Tool Execution**

Tools defined in `allTools` are automatically executed by the AI SDK. The `stepCountIs(10)` guard prevents infinite tool loops.

### Model Configuration

The example uses the Vercel AI Gateway. You can swap models by changing the model string:

```typescript
// OpenAI
model: "openai/gpt-4o";

// Anthropic
model: "anthropic/claude-sonnet-4-20250514";

// Direct provider (no gateway)
import { openai } from "@ai-sdk/openai";
model: openai("gpt-4o");
```

---

## Loading Chat History

Hydrate the chat component with previous messages when loading an existing conversation. The page fetches history server-side; the client component handles real-time updates.

### Chat Page

Create the chat page to load history:

```typescript
// src/app/[chatId]/page.tsx
import { Chat } from "@/components/chat";
import {
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

type Props = {
  params: Promise<{ chatId: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { chatId } = await params;

  // Load existing messages and convert to UI format
  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  return <Chat chatId={chatId} initialMessages={history} />;
}
```

### Chat Component

Create the chat component:

```tsx
// src/components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage } from "@/lib/chat/types";

type Props = {
  chatId: string;
  initialMessages: ChatAgentUIMessage[];
};

export function Chat({ chatId, initialMessages }: Props) {
  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    generateId: () => uuidv7(),
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}`,
      // Send only the latest message (server loads full history)
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          message: messages[messages.length - 1],
        },
      }),
    }),
  });

  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "text-right" : "text-left"}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-[80%] ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? <p key={i}>{part.text}</p> : null,
              )}
            </div>
          </div>
        ))}
      </div>

      <form
        className="p-4 border-t"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "ready"}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={status !== "ready" || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Home Page with Redirect

Redirect users to a new chat on the home page:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { v7 as uuidv7 } from "uuid";

export default function Home() {
  const newChatId = uuidv7();
  redirect(`/chats/${newChatId}`);
}
```

### Key Configuration

**UUID v7 for Message IDs**

```typescript
generateId: () => uuidv7(),
```

Client-generated UUID v7 IDs ensure messages are chronologically ordered and match server expectations.

**Custom Transport**

```typescript
transport: new DefaultChatTransport({
  api: `/api/chats/${chatId}`,
  prepareSendMessagesRequest: ({ messages }) => ({
    body: { message: messages[messages.length - 1] },
  }),
}),
```

The transport sends only the latest message. The server loads full history from the database, preventing tampering and ensuring consistency.

---

## How It Works

1. **New Chat**: User visits `/` and is redirected to `/chats/{chatId}` with a new UUID v7
2. **Load History**: The chat page loads existing messages from the database
3. **Send Message**: Client sends user message to the API
4. **Persist User Message**: API persists user message before streaming
5. **Stream Response**: AI response streams to the client
6. **Persist Assistant Message**: `onFinish` callback persists the assistant response
7. **Reload**: User can refresh and see full conversation history

---

## Rendering Message Parts

Handle different part types in your UI:

```tsx
function MessageContent({ parts }: { parts: ChatAgentUIMessage["parts"] }) {
  return (
    <>
      {parts.map((part, i) => {
        switch (part.type) {
          case "text":
            return <p key={i}>{part.text}</p>;

          case "reasoning":
            return (
              <details key={i} className="text-sm text-gray-500">
                <summary>Thinking...</summary>
                <p>{part.text}</p>
              </details>
            );

          case "tool-countCharacters":
            return (
              <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                {part.state === "output-available" && (
                  <span>{part.output.status}</span>
                )}
                {part.state === "output-error" && (
                  <span className="text-red-600">{part.errorText}</span>
                )}
              </div>
            );

          case "data-progress":
            return (
              <p key={i} className="text-sm text-gray-500 italic">
                {part.data.text}
              </p>
            );

          case "file":
            return (
              <a key={i} href={part.url} className="text-blue-600 underline">
                {part.filename || "Download file"}
              </a>
            );

          case "source-url":
            return (
              <a key={i} href={part.url} className="text-blue-600 underline">
                {part.title || part.url}
              </a>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
```

---

## References

- [AI SDK useChat Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK UIMessage Types](https://ai-sdk.dev/docs/reference/ai-sdk-ui/ui-message)
- [UUID v7 Specification](https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format)
