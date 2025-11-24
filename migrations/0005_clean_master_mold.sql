ALTER TABLE "message_tools" RENAME COLUMN "provider_metadata" TO "call_provider_metadata";--> statement-breakpoint
ALTER TABLE "message_tools" ALTER COLUMN "provider_executed" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "message_tools" ALTER COLUMN "provider_executed" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "error_text" text;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "input" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "output" jsonb;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "approval_id" text;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "approval_reason" text;--> statement-breakpoint
ALTER TABLE "message_tools" ADD COLUMN "approved" boolean;--> statement-breakpoint
ALTER TABLE "message_tools" DROP COLUMN "data";