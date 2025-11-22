ALTER TABLE "message_reasoning" ADD COLUMN "state" text DEFAULT 'done' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_texts" ADD COLUMN "state" text DEFAULT 'done' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "state" text DEFAULT 'call' NOT NULL;