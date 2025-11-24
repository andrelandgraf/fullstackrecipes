ALTER TABLE "message_tools" ALTER COLUMN "state" SET DEFAULT 'output-available';--> statement-breakpoint
ALTER TABLE "message_reasoning" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "message_texts" DROP COLUMN "state";