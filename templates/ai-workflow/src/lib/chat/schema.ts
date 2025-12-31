import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const chats = pgTable("chats", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  parts: jsonb("parts").notNull().$type<MessagePart[]>(),
  runId: text("run_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Chat = InferSelectModel<typeof chats>;
export type Message = InferSelectModel<typeof messages>;

export type TextPart = {
  type: "text";
  text: string;
};

export type ReasoningPart = {
  type: "reasoning";
  reasoning: string;
};

export type ToolInvocationPart = {
  type: "tool-invocation";
  toolInvocation: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    state: "pending" | "result" | "error";
    result?: unknown;
  };
};

export type SourcePart = {
  type: "source";
  source: {
    id: string;
    url: string;
    title: string;
  };
};

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcePart;
