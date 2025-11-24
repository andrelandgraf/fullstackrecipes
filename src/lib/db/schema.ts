import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * A chat is a conversation between a user and an assistant.
 */
export const chats = pgTable("chats", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * A message is a single message in a chat. A message consists of parts that make up the message.
 * If runId is not null, then the message is currently streaming as part of a workflow run.
 * After the workflow run is complete, the runId is set to null.
 */
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

/**
 * Reasoning parts - for AI reasoning/thinking content
 */
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

/**
 * Tool invocation parts - for tool calls and results
 */
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
    enum: ["tool-googleSearch", "tool-urlContext"],
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

/**
 * Source URL parts - for citing external sources
 */
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

/**
 * Parts not implemented:
 * - file (messageFiles)
 * - source-document (messageSourceDocuments)
 * - data (messageData)
 */

/**
 * Parts not persisted:
 * - step-start
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
export type MessageSourceUrl = typeof messageSourceUrls.$inferSelect;
export type NewMessageSourceUrl = typeof messageSourceUrls.$inferInsert;
