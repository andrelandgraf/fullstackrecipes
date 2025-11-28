import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TOOL_TYPES } from "@/lib/ai/tools";

export const chats = pgTable("chats", {
  id: uuid("id")
    .primaryKey()
    .default(sql`uuid_generate_v7()`),
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
