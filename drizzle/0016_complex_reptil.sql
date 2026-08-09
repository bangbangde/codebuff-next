CREATE TABLE "home_content_sections" (
	"section_key" text PRIMARY KEY NOT NULL,
	"markdown" text DEFAULT '' NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_content_sections_section_key_check" CHECK ("home_content_sections"."section_key" in ('now', 'about'))
);
--> statement-breakpoint
CREATE TABLE "home_latest_notes_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"display_limit" integer DEFAULT 1 NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "home_latest_notes_config_singleton_check" CHECK ("home_latest_notes_config"."id" = 1),
	CONSTRAINT "home_latest_notes_config_display_limit_check" CHECK ("home_latest_notes_config"."display_limit" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "home_latest_notes_pins" (
	"config_id" integer NOT NULL,
	"note_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "home_latest_notes_pins_config_id_note_id_pk" PRIMARY KEY("config_id","note_id"),
	CONSTRAINT "home_latest_notes_pins_config_position_unique" UNIQUE("config_id","position"),
	CONSTRAINT "home_latest_notes_pins_position_check" CHECK ("home_latest_notes_pins"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "home_content_sections" ADD CONSTRAINT "home_content_sections_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_latest_notes_config" ADD CONSTRAINT "home_latest_notes_config_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_latest_notes_pins" ADD CONSTRAINT "home_latest_notes_pins_config_id_home_latest_notes_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."home_latest_notes_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_latest_notes_pins" ADD CONSTRAINT "home_latest_notes_pins_note_id_article_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "home_content_sections" ("section_key", "markdown")
VALUES
	('now', '最近在系统梳理 React、Next.js 与 AI Native 开发，同时完善这个网站的内容管理和发布流程。'),
	('about', '我是一名软件工程师，主要从事 Web 产品与系统开发。

我关注软件工程、系统设计和 AI Native 开发，这个网站用于整理学习笔记，记录实践经验以及一些工作和生活中的思考。

目前在南京，正在关注合适的前端工程师相关机会。')
ON CONFLICT ("section_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "home_latest_notes_config" ("id", "display_limit")
VALUES (1, 1)
ON CONFLICT ("id") DO NOTHING;
