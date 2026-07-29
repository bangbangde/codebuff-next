import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const article = pgTable(
  "article",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").default("").notNull(),
    kind: text("kind").notNull(),
    language: text("language").notNull(),
    bodyMarkdown: text("body_markdown").default("").notNull(),
    revision: integer("revision").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("article_slug_unique").on(table.slug),
    index("article_updated_at_idx").on(table.updatedAt),
    check(
      "article_slug_format_check",
      sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`,
    ),
    check(
      "article_language_check",
      sql`${table.language} in ('zh-CN', 'en')`,
    ),
    check("article_revision_check", sql`${table.revision} >= 1`),
  ],
);
