# Chat Persistence with AI SDK, Drizzle & Neon

This guide shows how to persist chat messages to a Postgres database using Drizzle ORM and Neon. You'll learn how to save messages using the `onFinish` callback and load chat history on page load.

## Prerequisites

- Next.js app with AI SDK and AI Elements set up
- Drizzle ORM configured with Neon
- Basic chat UI working

## Required Packages

```bash
npm install uuid drizzle-orm pg @vercel/functions
npm install -D @types/uuid drizzle-kit
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

Create your schema file with tables for chats, messages, and message content:

```typescript
// src/lib/db/schemas/chat.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
```

Then re-export from the main schema file:

```typescript
// src/lib/db/schema.ts
export * from "./schemas/chat";
```

Run the migration to create your tables:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
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

## Query Helpers

Create helper functions to persist and retrieve messages:

```typescript
// src/lib/db/queries/chat.ts
import { db } from "@/lib/db/client";
import {
  chats,
  messages,
  messageTexts,
  type Message,
  type MessageText,
} from "@/lib/db/schema";
import type { UIMessage } from "ai";
import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

// ============================================================================
// Types
// ============================================================================

type MessagePart = { type: "text" } & MessageText;

export type MessageWithParts = Message & {
  parts: MessagePart[];
};

// ============================================================================
// Chat Operations
// ============================================================================

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

// ============================================================================
// Message Persistence
// ============================================================================

/**
 * Persist a message with its text parts to the database.
 * Uses UUID v7 for part IDs to maintain chronological ordering.
 */
export async function persistMessage({
  chatId,
  message,
}: {
  chatId: string;
  message: UIMessage;
}): Promise<void> {
  // Insert message record
  const [{ messageId }] = await db
    .insert(messages)
    .values({
      id: message.id || uuidv7(),
      chatId,
      role: message.role,
    })
    .returning({ messageId: messages.id });

  // Extract and insert text parts
  const textParts = message.parts.filter(
    (part): part is Extract<typeof part, { type: "text" }> =>
      part.type === "text",
  );

  if (textParts.length > 0) {
    await db.insert(messageTexts).values(
      textParts.map((part) => ({
        id: uuidv7(), // UUID v7 ensures chronological order
        messageId,
        chatId,
        text: part.text,
      })),
    );
  }
}

/**
 * Persist a user message to the database.
 */
export async function persistUserMessage(
  chatId: string,
  message: UIMessage,
): Promise<void> {
  await persistMessage({ chatId, message });
}

/**
 * Persist an assistant message to the database.
 */
export async function persistAssistantMessage(
  chatId: string,
  message: UIMessage,
): Promise<void> {
  await persistMessage({ chatId, message });
}

// ============================================================================
// Message Retrieval
// ============================================================================

/**
 * Get all messages for a chat with their text parts.
 * Parts are sorted by UUID v7 ID to maintain chronological order.
 */
export async function getChatMessages(
  chatId: string,
): Promise<MessageWithParts[]> {
  // Fetch messages and text parts in parallel
  const [messagesData, textsData] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    }),
    db.query.messageTexts.findMany({
      where: eq(messageTexts.chatId, chatId),
    }),
  ]);

  // Group parts by messageId
  const partsMap = new Map<string, MessagePart[]>();

  for (const text of textsData) {
    const existing = partsMap.get(text.messageId) || [];
    existing.push({ ...text, type: "text" as const });
    partsMap.set(text.messageId, existing);
  }

  // Assemble messages with their parts
  return messagesData.map((message) => {
    const parts = partsMap.get(message.id) || [];
    // UUID v7 IDs are chronologically ordered - sort by ID for insertion order
    parts.sort((a, b) => a.id.localeCompare(b.id));

    return {
      ...message,
      parts,
    };
  });
}

// ============================================================================
// Conversion Helpers
// ============================================================================

/**
 * Convert database messages to AI SDK UIMessage format.
 */
export function convertDbMessagesToUIMessages(
  messageHistory: MessageWithParts[],
): UIMessage[] {
  return messageHistory.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    parts: msg.parts.map((part) => ({
      type: "text" as const,
      text: part.text,
    })),
  }));
}
```

## API Route with Persistence

Update your chat API route to persist messages using `onFinish`:

```typescript
// src/app/api/chats/[chatId]/route.ts
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import {
  persistUserMessage,
  persistAssistantMessage,
  ensureChatExists,
  getChatMessages,
} from "@/lib/db/queries/chat";

export const maxDuration = 30;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { chatId } = await params;
  const { message }: { message: UIMessage } = await req.json();

  // Ensure chat exists
  await ensureChatExists(chatId);

  // Persist user message first
  await persistUserMessage(chatId, message);

  // Get full conversation history for context
  const history = await getChatMessages(chatId);

  const result = streamText({
    model: "anthropic/claude-sonnet-4-20250514",
    system: "You are a helpful assistant.",
    messages: convertToModelMessages(history),
    onFinish: async ({ response }) => {
      // Persist assistant response after streaming completes
      await persistAssistantMessage(chatId, response.messages[0]);
    },
  });

  return result.toUIMessageStreamResponse();
}
```

## Client-Side Chat Component

Create a chat component that includes the `chatId` in requests:

```tsx
// src/app/[chatId]/page.tsx
import { Chat } from "@/components/chat";
import {
  getChatMessages,
  ensureChatExists,
  convertDbMessagesToUIMessages,
} from "@/lib/db/queries/chat";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatPage({ params }: PageProps) {
  const { chatId } = await params;

  // Ensure chat exists
  await ensureChatExists(chatId);

  // Load existing messages and convert to UI format
  const dbMessages = await getChatMessages(chatId);
  const history = convertDbMessagesToUIMessages(dbMessages);

  return <Chat chatId={chatId} initialMessages={history} />;
}
```

```tsx
// src/components/chat.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import type { UIMessage } from "ai";

interface ChatProps {
  chatId: string;
  initialMessages: UIMessage[];
}

export function Chat({ chatId, initialMessages }: ChatProps) {
  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}`,
      // Send only the latest message (server loads full history)
      prepareRequestBody: ({ messages }) => ({
        message: messages[messages.length - 1],
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

## Home Page with Redirect

Redirect to a new chat on the home page:

```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";
import { v7 as uuidv7 } from "uuid";

export default function Home() {
  const newChatId = uuidv7();
  redirect(`/${newChatId}`);
}
```

## How It Works

1. **New Chat**: When a user visits `/`, they're redirected to `/{chatId}` with a new UUID v7
2. **Load History**: The chat page loads existing messages from the database
3. **Send Message**: The client sends the user message to the API
4. **Persist User Message**: The API persists the user message before streaming
5. **Stream Response**: The AI response is streamed to the client
6. **Persist Assistant Message**: `onFinish` callback persists the assistant response
7. **Reload**: If the user refreshes, they see the full conversation history

## Key Design Decisions

### UUID v7 for All IDs

Every record uses UUID v7 as its primary key:

- Generated client-side for messages (`message.id`)
- Generated server-side for parts (`uuidv7()`)
- Enables sorting by ID instead of timestamp
- No auto-increment coordination needed

### Separate Tables for Message Parts

Message content is stored in separate tables (`messageTexts`, etc.) rather than JSONB:

- Enables efficient queries for specific part types
- Supports parallel insertion of different part types
- Maintains chronological order via UUID v7 IDs

### Server-Side History Loading

The API loads full history from the database rather than trusting client-sent messages:

- Single source of truth
- Prevents message tampering
- Client only sends the latest user message

## Next Steps

- Add message reasoning/thinking persistence
- Add tool call persistence
- Add file attachment support
- Add source URL persistence for grounded responses
- Implement chat list and navigation
- See [Resumable Workflows](./resumable-workflows.md) for advanced workflow patterns
