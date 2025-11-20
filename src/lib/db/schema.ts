import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

/**
 * A chat is a conversation between a user and an assistant.
 */
export const chats = pgTable("chats", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * A message is a single message in a chat.
 */
export const messages = pgTable("messages", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  runId: text("run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Message parts are stored in separate tables by type.
 * Each table includes chatId for parallel fetching and avoiding JOINs.
 *
 * UUID v7 is used for part IDs - these are time-ordered UUIDs that naturally
 * sort chronologically. This eliminates the need for a separate order field.
 * Simply sort by ID to get parts in chronological order.
 */

/**
 * Text parts - the most common message part type
 */
export const messageTexts = pgTable("message_texts", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
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

/**
 * Reasoning parts - for AI reasoning/thinking content
 */
export const messageReasoning = pgTable("message_reasoning", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
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

/**
 * Tool invocation parts - for tool calls and results
 */
export const messageTools = pgTable("message_tools", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  toolCallId: text("tool_call_id").notNull(),
  title: text("title"),
  providerExecuted: boolean("provider_executed"),
  // Store args, result, state in data field
  data: jsonb("data"),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * File parts - for attached files and images
 */
export const messageFiles = pgTable("message_files", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  filename: text("filename"),
  mediaType: text("media_type").notNull(),
  url: text("url").notNull(),
  providerMetadata: jsonb("provider_metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Source URL parts - for referenced URLs
 */
export const messageSourceUrls = pgTable("message_source_urls", {
  id: uuid("id").$defaultFn(uuidv7).primaryKey(),
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

/**
 * Parts not implemented:
 * - source-document (messageSourceDocuments)
 * - data (messageData)
 * - step-start (messageStepStarts)
 */

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
export type MessageFile = typeof messageFiles.$inferSelect;
export type NewMessageFile = typeof messageFiles.$inferInsert;
export type MessageSourceUrl = typeof messageSourceUrls.$inferSelect;
export type NewMessageSourceUrl = typeof messageSourceUrls.$inferInsert;
