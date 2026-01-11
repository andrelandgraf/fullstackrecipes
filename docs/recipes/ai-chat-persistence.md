### Install packages

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
import { users } from "@/lib/auth/schema";
import { TOOL_TYPES } from "@/lib/ai/tools";

export const chats = pgTable("chats", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// runId is non-null while message is streaming, null when complete
export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  runId: text("run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

The `runId` column enables stream resumption - it's set when a message starts streaming and cleared when complete.

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
  toolType: text("tool_type", {
    enum: TOOL_TYPES,
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
bun run db:generate
bun run db:migrate
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

### runId for Stream Resumption

The `runId` column on messages enables workflow stream resumption:

- Set when streaming starts, cleared when complete
- If a user refreshes mid-stream, the page can detect incomplete messages
- Pass `runId` to client for automatic reconnection

---

## Chat Types

Define types that extend AI SDK's base types with your tools and data parts. Place these in your workflow folder:

```typescript
// src/workflows/chat/types.ts
import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools, TOOL_TYPES } from "@/lib/ai/tools";
import assert from "@/lib/common/assert";

const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

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

const VALID_PART_TYPES = new Set([
  "text",
  "reasoning",
  "source-url",
  "source-document",
  "file",
  "step-start",
  "data-progress",
  ...TOOL_TYPES,
]);

/**
 * Asserts that UIMessage parts are valid ChatAgentUIMessage parts.
 * Validates tool types against known TOOL_TYPES and data types against known data part types.
 */
export function assertChatAgentParts(
  parts: UIMessage["parts"],
): asserts parts is ChatAgentUIMessage["parts"] {
  for (const part of parts) {
    if (part.type.startsWith("tool-")) {
      assert(
        TOOL_TYPES.includes(part.type as (typeof TOOL_TYPES)[number]),
        `Unknown tool type: ${part.type}. Valid types: ${TOOL_TYPES.join(", ")}`,
      );
    } else if (part.type.startsWith("data-")) {
      assert(
        part.type === "data-progress",
        `Unknown data type: ${part.type}. Valid types: data-progress`,
      );
    } else {
      assert(
        VALID_PART_TYPES.has(part.type),
        `Unknown part type: ${part.type}. Valid types: ${[...VALID_PART_TYPES].join(", ")}`,
      );
    }
  }
}
```

---

## Tool Definitions

Define your tools with their schemas. The `TOOL_TYPES` array must match tool keys prefixed with `tool-`:

```typescript
// src/lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const researchTools = {
  webSearch: tool({
    description: "Search the web for information on a topic",
    inputSchema: z.object({
      query: z.string().describe("The search query"),
    }),
    execute: async ({ query }: { query: string }) => {
      // Implement your web search logic here
      return {
        results: [
          {
            title: `Search result for: ${query}`,
            url: "https://example.com",
            snippet: "This is a placeholder search result.",
          },
        ],
      };
    },
  }),
};

export const draftingTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
    inputSchema: z.object({
      text: z.string().describe("The text to count characters for"),
    }),
    execute: async ({ text }: { text: string }) => {
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
  saveDocument: tool({
    description: "Save a document draft",
    inputSchema: z.object({
      title: z.string().describe("Document title"),
      content: z.string().describe("Document content"),
    }),
    execute: async ({ title, content }: { title: string; content: string }) => {
      return {
        saved: true,
        title,
        contentLength: content.length,
      };
    },
  }),
};

export const allTools = {
  ...researchTools,
  ...draftingTools,
};

// Tool type names for database schema - must match keys in allTools as "tool-{key}"
export const TOOL_TYPES = [
  "tool-webSearch",
  "tool-countCharacters",
  "tool-saveDocument",
] as const;

export type ToolType = (typeof TOOL_TYPES)[number];
```

---

## Query Helpers

Create functions to persist and retrieve messages:

```typescript
// src/lib/chat/queries.ts
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
import { eq, and, desc } from "drizzle-orm";

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
```

### Message Part Insertion

Pre-generate UUID v7 IDs to maintain insertion order:

```typescript
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
```

### Converting to UI Messages

Transform database records back to AI SDK format:

```typescript
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
```

---

## Chat List Queries

Add functions to list and manage user chats:

```typescript
export type ChatWithPreview = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessagePreview: string | null;
};

export async function getUserChats(userId: string): Promise<ChatWithPreview[]> {
  const userChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)],
  });

  const chatPreviews = await Promise.all(
    userChats.map(async (chat) => {
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chat.id),
      });

      const lastUserMessage = chatMessages
        .filter((m) => m.role === "user")
        .at(-1);

      let lastMessagePreview: string | null = null;
      if (lastUserMessage) {
        const textPart = await db.query.messageTexts.findFirst({
          where: eq(messageTexts.messageId, lastUserMessage.id),
        });
        lastMessagePreview = textPart?.text?.slice(0, 100) ?? null;
      }

      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messageCount: chatMessages.length,
        lastMessagePreview,
      };
    }),
  );

  return chatPreviews;
}

export async function deleteChat(
  chatId: string,
  userId: string,
): Promise<boolean> {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    return false;
  }

  await db.delete(chats).where(eq(chats.id, chatId));
  return true;
}

export async function renameChat(
  chatId: string,
  userId: string,
  newTitle: string,
): Promise<boolean> {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    return false;
  }

  await db
    .update(chats)
    .set({ title: newTitle, updatedAt: new Date() })
    .where(eq(chats.id, chatId));
  return true;
}
```

---

## References

- [AI SDK useChat Documentation](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK UIMessage Types](https://ai-sdk.dev/docs/reference/ai-sdk-ui/ui-message)
- [UUID v7 Specification](https://datatracker.ietf.org/doc/html/draft-peabody-dispatch-new-uuid-format)
