import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { category } from "./article-taxonomy";

export const article = pgTable(
  "article",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").default("").notNull(),
    bodyMarkdown: text("body_markdown").default("").notNull(),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    revision: integer("revision").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("article_updated_at_idx").on(table.updatedAt),
    index("article_category_id_idx").on(table.categoryId),
    check("article_revision_check", sql`${table.revision} >= 1`),
  ],
);
