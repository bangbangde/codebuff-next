DROP TABLE "article_media_reference" CASCADE;--> statement-breakpoint
DROP TABLE "media_asset" CASCADE;--> statement-breakpoint
CREATE TABLE "article_asset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_asset_type_check" CHECK ("article_asset"."media_type" in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf')),
	CONSTRAINT "article_asset_size_check" CHECK ("article_asset"."byte_size" > 0 and "article_asset"."byte_size" <= 10485760),
	CONSTRAINT "article_asset_sha256_check" CHECK ("article_asset"."sha256" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "article_asset" ADD CONSTRAINT "article_asset_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "article_asset_object_key_unique" ON "article_asset" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "article_asset_article_id_idx" ON "article_asset" USING btree ("article_id");