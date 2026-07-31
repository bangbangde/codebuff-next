-- M015-1: 单表双槽位数据模型重构
-- 将现有草稿字段重命名，新增线上槽位与发布元数据字段
ALTER TABLE "article" RENAME COLUMN "title" TO "draft_title";--> statement-breakpoint
ALTER TABLE "article" RENAME COLUMN "body_markdown" TO "draft_content";--> statement-breakpoint
ALTER TABLE "article" RENAME COLUMN "revision" TO "draft_revision";--> statement-breakpoint
ALTER TABLE "article" RENAME COLUMN "updated_at" TO "draft_updated_at";--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "summary" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "cover_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "published_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "article" ADD COLUMN "published_from_revision" integer;--> statement-breakpoint
ALTER TABLE "article" DROP CONSTRAINT "article_revision_check";--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_draft_revision_check" CHECK ("article"."draft_revision" >= 1);--> statement-breakpoint
ALTER INDEX "article_updated_at_idx" RENAME TO "article_draft_updated_at_idx";--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_cover_asset_id_article_asset_id_fk" FOREIGN KEY ("cover_asset_id") REFERENCES "public"."article_asset"("id") ON DELETE set null ON UPDATE no action;
