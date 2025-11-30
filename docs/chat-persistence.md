# Chat Persistence with AI SDK, Drizzle & Neon

This guide shows how to build a tweet drafting assistant with persistent chat history. You'll learn how to save messages to a Postgres database using Drizzle ORM and load chat history on page load.

Chats are tied to authenticated users via Better Auth, ensuring each user can only access their own conversations.

## Prerequisites

- Completed [Setup](./setup.md) (Next.js, Drizzle, AI SDK, Neon)
- Completed [Better Auth Setup](./sections/better-auth-setup.md) (User authentication)

## Required Packages

```bash
bun add uuid zod
bun add -D @types/uuid
```

We use the `uuid` package for generating UUID v7 identifiers:

```typescript
import { v7 as uuidv7 } from "uuid";

const id = uuidv7(); // e.g., "019012c5-7f3a-7000-8000-000000000000"
```

### Why UUID v7?

UUID v7 is critical for this architecture because it's **chronologically sortable**. The first 48 bits encode a Unix timestamp, meaning IDs generated later are lexicographically greater than earlier ones.

This enables:

- **Message ordering** - Sort by ID instead of requiring a separate `createdAt` index
- **Part ordering** - Message parts (text, reasoning, tools) maintain insertion order when sorted by ID
- **Efficient queries** - UUID v7 primary keys can serve as natural sort keys

```typescript
// Parts are sorted by ID to maintain chronological order
parts.sort((a, b) => a.id.localeCompare(b.id));
```

This way, we can avoid an `order`/`index` column for each message part in the DB.

## Database Schema

Create your schema file with tables for chats, messages, and all message part types:

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

// Message parts stored in separate tables. UUID v7 IDs enable chronological sorting.

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
  // Must match TOOL_TYPES from tools.ts
  toolType: text("tool_type", {
    enum: ["tool-countCharacters"],
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
  dataType: text("data_type").notNull(), // data-weather, data-news, etc.
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  mediaType: text("media_type").notNull(), // IANA media type (e.g., image/png, application/pdf)
  filename: text("filename"), // Optional filename
  url: text("url").notNull(), // Data URL or regular URL
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  mediaType: text("media_type").notNull(), // IANA media type
  title: text("title").notNull(),
  filename: text("filename"), // Optional filename
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
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

Then re-export from the main schema file:

```typescript
// src/lib/db/schema.ts
export * from "@/lib/chat/schema";
export * from "@/lib/auth/schema";
```

### Drizzle Config

Create the Drizzle configuration file:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### UUID v7 Postgres Function

The schema uses `uuid_generate_v7()` for default IDs. You have two options:

**Option 1: Use the `pg_uuidv7` extension**

```sql
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
```

**Option 2: PostgreSQL 18+**

PostgreSQL 18 includes native UUID v7 support via `uuidv7()`. Update your schema to use `uuidv7()` instead of `uuid_generate_v7()`.

Run the migration to create your tables:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

## Assert Helper

A simple assertion utility used throughout:

```typescript
// src/lib/common/assert.ts
const prefix: string = "Assertion failed";

export default function assert(
  condition: any,
  message?: string | (() => string),
): asserts condition {
  if (condition) {
    return;
  }

  const provided: string | undefined =
    typeof message === "function" ? message() : message;
  const value: string = provided ? `${prefix}: ${provided}` : prefix;
  throw new Error(value);
}
```

## Database Client

Set up your Drizzle client with a connection pool:

```typescript
// src/lib/db/client.ts
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import assert from "../common/assert";
import * as schema from "./schema";

assert(
  process.env.DATABASE_URL,
  "DATABASE_URL environment variable must be set",
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
attachDatabasePool(pool);

const db = drizzle({ client: pool, schema });

export { db };
```

## Chat Types

Define types for your chat agent that extend the AI SDK's base types with your tools and data parts:

```typescript
// src/lib/chat/types.ts
import type { UIMessage, UIMessagePart, InferUITools } from "ai";
import { z } from "zod";
import { allTools } from "@/lib/ai/tools";

const metadataSchema = z.object({});
type ChatMetadata = z.infer<typeof metadataSchema>;

// Data parts allow streaming custom structured data to the client.
// This example defines a "progress" data part for status updates.
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

Define your tools with their schemas. This example creates a tweet drafting assistant:

```typescript
// src/lib/ai/tools.ts
import { tool } from "ai";
import { z } from "zod";

export const allTools = {
  countCharacters: tool({
    description:
      "Count the number of characters in a text. Use this to verify tweet length before finalizing.",
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

// Tool type names for database schema - must match keys in allTools as "tool-{key}"
export const TOOL_TYPES = ["tool-countCharacters"] as const;

export type ToolType = (typeof TOOL_TYPES)[number];
```

The `TOOL_TYPES` array must match your tool keys prefixed with `tool-` for the database schema's enum constraint on the `messageTools` table.

## Query Helpers

Create helper functions to persist and retrieve messages:

```typescript
// src/lib/chat/queries.ts
import { TOOL_TYPES, type ToolType } from "@/lib/ai/tools";
import {
  isToolPart,
  type ChatAgentUIMessage,
  type ChatToolPart,
} from "@/lib/chat/types";
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
} from "@/lib/db/schema";
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

  // Verify the chat belongs to the current user
  return existing.userId === userId;
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

/**
 * Get chat messages for a specific chat, verifying user ownership.
 * Returns null if the chat doesn't exist or belongs to a different user.
 */
export async function getChatMessages(
  chatId: string,
  userId: string,
): Promise<MessageWithParts[] | null> {
  // First verify the chat belongs to the user
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    return null;
  }

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

## API Route with Persistence

Update your chat API route to persist messages using `onFinish`. The route authenticates the user and ensures they can only access their own chats:

```typescript
// src/app/api/chats/[chatId]/route.ts
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { headers } from "next/headers";
import type { ChatAgentUIMessage } from "@/lib/chat/types";
import { allTools } from "@/lib/ai/tools";
import { auth } from "@/lib/auth/server";
import {
  ensureChatExists,
  persistMessage,
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

const systemPrompt = `You are a tweet drafting assistant. Your job is to help users craft engaging, impactful tweets that fit within the 280 character limit. You understand the nuances of Twitter/X culture, including effective use of hashtags, mentions, and hooks that capture attention.

When drafting tweets, always use the countCharacters tool to verify the length before presenting a final draft. If a tweet is over the limit, proactively suggest shorter alternatives. Offer multiple variations when appropriate, and explain your reasoning for word choices and structure.`;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  // Authenticate the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const { chatId } = await params;
  const { message }: { message: ChatAgentUIMessage } = await req.json();

  // Ensure chat exists and belongs to the user
  const isAuthorized = await ensureChatExists(chatId, userId);
  if (!isAuthorized) {
    return new Response("Forbidden", { status: 403 });
  }

  // Persist user message first
  await persistMessage({ chatId, message });

  // Get full conversation history for context
  const dbMessages = await getChatMessages(chatId, userId);
  if (!dbMessages) {
    return new Response("Chat not found", { status: 404 });
  }
  const history = convertDbMessagesToUIMessages(dbMessages);

  const result = streamText({
    // Vercel AI Gateway - requires AI_GATEWAY_API_KEY env var
    model: "google/gemini-2.5-pro-preview-05-06",
    system: systemPrompt,
    messages: convertToModelMessages(history),
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

## Client-Side Chat Component

Create a chat component that includes the `chatId` in requests. The page authenticates the user server-side and only loads their own chats:

```tsx
// src/app/[chatId]/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Chat } from "@/components/chat";
import { auth } from "@/lib/auth/server";
import {
  getChatMessages,
  convertDbMessagesToUIMessages,
} from "@/lib/chat/queries";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  // Authenticate the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const { chatId } = await params;

  // Load existing messages (returns null if chat doesn't belong to user)
  const dbMessages = await getChatMessages(chatId, session.user.id);
  const history = dbMessages ? convertDbMessagesToUIMessages(dbMessages) : [];

  return <Chat chatId={chatId} initialMessages={history} />;
}
```

```tsx
// src/components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { v7 as uuidv7 } from "uuid";
import type { ChatAgentUIMessage } from "@/lib/chat/types";

interface ChatProps {
  chatId: string;
  initialMessages: ChatAgentUIMessage[];
}

export function Chat({ chatId, initialMessages }: ChatProps) {
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
    <div>
      {messages.map((message) => (
        <div key={message.id}>
          {message.role === "user" ? "User: " : "AI: "}
          {message.parts.map((part, index) =>
            part.type === "text" ? <span key={index}>{part.text}</span> : null,
          )}
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Say something..."
        />
        <button type="submit" disabled={status !== "ready"}>
          Send
        </button>
      </form>
    </div>
  );
}
```

## Protected New Chat Route

Create a protected route that redirects authenticated users to a new chat:

```tsx
// src/app/chat/new/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { v7 as uuidv7 } from "uuid";
import { auth } from "@/lib/auth/server";

export default async function NewChat() {
  // Authenticate the user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const newChatId = uuidv7();
  redirect(`/${newChatId}`);
}
```

The home page can remain a public landing page with links to login/signup, while the chat functionality requires authentication.

## How It Works

1. **Authentication**: User signs in via Better Auth (email/password or social providers)
2. **New Chat**: Authenticated user visits `/chat/new`, gets redirected to `/{chatId}` with a new UUID v7
3. **Load History**: The chat page verifies user ownership and loads existing messages from the database
4. **Send Message**: The client sends the user message to the API
5. **Authorization**: API verifies the chat belongs to the authenticated user
6. **Persist User Message**: The API persists the user message before streaming
7. **Stream Response**: The AI response is streamed to the client
8. **Persist Assistant Message**: `onFinish` callback persists the assistant response
9. **Reload**: If the user refreshes, they see their full conversation history

## Key Design Decisions

### UUID v7 for All IDs

Every record uses UUID v7 as its primary key:

- Generated client-side for messages (`message.id`)
- Generated server-side for parts (`uuidv7()`)
- Enables sorting by ID instead of timestamp
- No auto-increment coordination needed

### Separate Tables for Message Parts

Message content is stored in separate tables (`messageTexts`, `messageReasoning`, `messageTools`, `messageSourceUrls`, `messageData`, `messageFiles`, `messageSourceDocuments`) rather than JSONB:

- Enables efficient queries for specific part types
- Supports parallel insertion of different part types
- Maintains chronological order via UUID v7 IDs

### Server-Side History Loading

The API loads full history from the database rather than trusting client-sent messages:

- Single source of truth
- Prevents message tampering
- Client only sends the latest user message

### User-Scoped Chats

Every chat is tied to a user via the `userId` foreign key:

- Chats are created with the authenticated user's ID
- All queries filter by both `chatId` and `userId`
- Prevents unauthorized access to other users' conversations
- Cascading deletes: when a user is deleted, their chats are automatically removed

## Next Steps

- Implement chat list and navigation
