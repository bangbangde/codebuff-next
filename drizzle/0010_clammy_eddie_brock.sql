ALTER TABLE "article_asset" ADD COLUMN "status" text DEFAULT 'temporary' NOT NULL;--> statement-breakpoint
ALTER TABLE "article_asset" ADD COLUMN "status_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "article_asset_article_id_status_idx" ON "article_asset" USING btree ("article_id","status");--> statement-breakpoint
CREATE INDEX "article_asset_status_updated_at_idx" ON "article_asset" USING btree ("status_updated_at");--> statement-breakpoint
ALTER TABLE "article_asset" ADD CONSTRAINT "article_asset_status_check" CHECK ("article_asset"."status" in ('uploading', 'temporary', 'active', 'pending_delete', 'deleted'));--> statement-breakpoint
-- 既有资产视为已在用（active），避免被清理任务误删；引用同步任务会随后将无引用的降级为 pending_delete。
UPDATE "article_asset" SET "status" = 'active', "status_updated_at" = now() WHERE "status" = 'temporary';