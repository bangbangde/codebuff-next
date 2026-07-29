CREATE TABLE "article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"kind" text NOT NULL,
	"language" text NOT NULL,
	"body_markdown" text DEFAULT '' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_slug_format_check" CHECK ("article"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "article_language_check" CHECK ("article"."language" in ('zh-CN', 'en')),
	CONSTRAINT "article_revision_check" CHECK ("article"."revision" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "article_slug_unique" ON "article" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "article_updated_at_idx" ON "article" USING btree ("updated_at");