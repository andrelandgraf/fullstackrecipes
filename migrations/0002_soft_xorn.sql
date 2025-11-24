CREATE TABLE "message_source_urls" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"message_id" uuid NOT NULL,
	"chat_id" uuid NOT NULL,
	"source_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"provider_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_source_urls" ADD CONSTRAINT "message_source_urls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_source_urls" ADD CONSTRAINT "message_source_urls_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;