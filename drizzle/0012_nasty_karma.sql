ALTER TABLE "article" ADD COLUMN "draft_session_id" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "draft_sequence" integer DEFAULT 0 NOT NULL;