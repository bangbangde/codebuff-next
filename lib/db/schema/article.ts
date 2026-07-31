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
    // 草稿槽位
    draftTitle: text("draft_title").default("").notNull(),
    draftContent: text("draft_content").default("").notNull(),
    draftRevision: integer("draft_revision").default(1).notNull(),
    draftUpdatedAt: timestamp("draft_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // 线上槽位（首次发布前为 null）
    // coverAssetId 的 FK 约束由迁移 0009 定义；此处不使用 .references()
    // 以避免与 article-asset.ts 形成循环类型推导
    title: text("title"),
    content: text("content"),
    summary: text("summary").default("").notNull(),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    coverAssetId: uuid("cover_asset_id"),
    // 发布元数据
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedUpdatedAt: timestamp("published_updated_at", {
      withTimezone: true,
    }),
    publishedFromRevision: integer("published_from_revision"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("article_draft_updated_at_idx").on(table.draftUpdatedAt),
    index("article_category_id_idx").on(table.categoryId),
    check(
      "article_draft_revision_check",
      sql`${table.draftRevision} >= 1`,
    ),
  ],
);
