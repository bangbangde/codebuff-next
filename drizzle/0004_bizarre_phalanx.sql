CREATE TABLE "article_media_reference" (
	"article_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_media_reference_pk" PRIMARY KEY("article_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "article_media_reference" ADD CONSTRAINT "article_media_reference_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_media_reference" ADD CONSTRAINT "article_media_reference_media_id_media_asset_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_asset"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_media_reference_media_id_idx" ON "article_media_reference" USING btree ("media_id");