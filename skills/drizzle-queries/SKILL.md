---
name: drizzle-queries
description: Write type-safe Postgres queries with Drizzle ORM (select/insert/update/delete, relations, new tables). Use when querying or mutating the database or adding a Drizzle table.
---

# Drizzle Queries

Write type-safe Postgres queries with Drizzle ORM.

## Prerequisites

Complete these setup recipes first:

- Neon + Drizzle Setup

### Selecting

Import `db` from `@/lib/db/client` and operators from `drizzle-orm`. For a single row, `.limit(1)` then take `rows[0]`.

```typescript
import { db } from "@/lib/db/client";
import { chats } from "@/lib/chat/schema";
import { eq, desc } from "drizzle-orm";

const allChats = await db.select().from(chats);

const userChats = await db
  .select()
  .from(chats)
  .where(eq(chats.userId, userId))
  .orderBy(desc(chats.createdAt));

const chat = await db
  .select()
  .from(chats)
  .where(eq(chats.id, chatId))
  .limit(1)
  .then((rows) => rows[0]);
```

### Inserting

Use `.returning()` when the inserted row is needed back.

```typescript
const [newChat] = await db
  .insert(chats)
  .values({ userId, title: "New Chat" })
  .returning();

await db.insert(messages).values([
  { chatId, role: "user", content: "Hello" },
  { chatId, role: "assistant", content: "Hi there!" },
]);
```

### Updating

```typescript
await db
  .update(chats)
  .set({ title: "Updated Title" })
  .where(eq(chats.id, chatId));
```

### Deleting

```typescript
await db.delete(chats).where(eq(chats.id, chatId));
```

### Relational Queries

Use `db.query.<table>` for relations instead of manual joins.

```typescript
const chatWithMessages = await db.query.chats.findFirst({
  where: eq(chats.id, chatId),
  with: {
    messages: {
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    },
  },
});
```

### Adding a Table

Co-locate the schema in the feature's library folder, register it on the shared client, then migrate.

```typescript
// src/lib/feature/schema.ts
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

```typescript
// src/lib/db/client.ts
import * as itemSchema from "@/lib/feature/schema";

const schema = { ...authSchema, ...chatSchema, ...itemSchema };
```

```bash
bun run db:generate
bun run db:migrate
```

---

## References

- [Drizzle ORM Select](https://orm.drizzle.team/docs/select)
- [Drizzle ORM Insert](https://orm.drizzle.team/docs/insert)
- [Drizzle ORM Relational Queries](https://orm.drizzle.team/docs/rqb)
