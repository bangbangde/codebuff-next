ALTER TABLE "article" DROP CONSTRAINT "article_slug_format_check";--> statement-breakpoint
ALTER TABLE "article" DROP CONSTRAINT "article_language_check";--> statement-breakpoint
DROP INDEX "article_slug_unique";--> statement-breakpoint
ALTER TABLE "article" ALTER COLUMN "title" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "slug";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "language";