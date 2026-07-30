DROP INDEX "category_name_unique";--> statement-breakpoint
DROP INDEX "tag_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "category_name_unique" ON "category" USING btree (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "tag_name_unique" ON "tag" USING btree (lower("name"));