CREATE TABLE "media_asset" (
	"id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"media_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"sha256" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"failure_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_asset_type_check" CHECK ("media_asset"."media_type" in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf')),
	CONSTRAINT "media_asset_size_check" CHECK ("media_asset"."byte_size" > 0 and "media_asset"."byte_size" <= 10485760),
	CONSTRAINT "media_asset_sha256_check" CHECK ("media_asset"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "media_asset_status_check" CHECK ("media_asset"."status" in ('pending', 'ready', 'failed')),
	CONSTRAINT "media_asset_failure_check" CHECK (("media_asset"."status" = 'failed' and "media_asset"."failure_code" is not null) or ("media_asset"."status" <> 'failed' and "media_asset"."failure_code" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_object_key_unique" ON "media_asset" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "media_asset_created_at_idx" ON "media_asset" USING btree ("created_at");