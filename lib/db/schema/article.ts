import { sql } from "drizzle-orm";
import {
  check,
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { category } from "./article-taxonomy";
import { articleAsset } from "./article-asset";

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
    // 编辑会话标识 + 单调序号，用于拒绝同一会话内的旧序号保存请求，
    // 防止并发保存请求的网络乱序导致旧请求覆盖正文。
    // 跨会话仍 last write wins（见 repository.update 的 WHERE 条件）。
    draftSessionId: text("draft_session_id"),
    draftSequence: integer("draft_sequence").default(0).notNull(),
    // 线上槽位（首次发布前为 null）
    // 显式返回 AnyPgColumn，保留循环外键的 schema 所有权并避免循环类型推导。
    title: text("title"),
    content: text("content"),
    summary: text("summary").default("").notNull(),
    categoryId: uuid("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    coverAssetId: uuid("cover_asset_id").references(
      (): AnyPgColumn => articleAsset.id,
      { onDelete: "set null" },
    ),
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
