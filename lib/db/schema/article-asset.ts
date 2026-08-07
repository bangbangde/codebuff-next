import { sql } from "drizzle-orm";
import {
  check,
  type AnyPgColumn,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { article } from "./article";

/**
 * 资源生命周期状态机（M20 资源生命周期管理）。
 *
 * - `uploading`：上传任务进行中（客户端态，落库时一般不使用）。
 * - `temporary`：上传成功并落库，但尚未被文章正文或封面正式引用。
 * - `active`：已被文章草稿正文、线上正文或封面正式引用。
 * - `pending_delete`：引用已移除，等待后台清理任务安全删除 Garage 对象。
 *   资产，保存/发布校验视为不可用。
 * - `deleted`：Garage 对象已删除，记录保留用于审计/修复。
 */
export const articleAssetStatuses = [
  "uploading",
  "temporary",
  "active",
  "pending_delete",
  "deleted",
] as const;

export type ArticleAssetStatus = (typeof articleAssetStatuses)[number];

export const articleAsset = pgTable(
  "article_asset",
  {
    id: uuid("id").primaryKey(),
    articleId: uuid("article_id")
      .notNull()
      .references((): AnyPgColumn => article.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    originalFilename: text("original_filename").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    status: text("status").notNull().default("temporary"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("article_asset_object_key_unique").on(table.objectKey),
    index("article_asset_article_id_idx").on(table.articleId),
    index("article_asset_article_id_status_idx").on(
      table.articleId,
      table.status,
    ),
    index("article_asset_status_updated_at_idx").on(table.statusUpdatedAt),
    check(
      "article_asset_type_check",
      sql`${table.mediaType} in ('image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf')`,
    ),
    check(
      "article_asset_size_check",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= 10485760`,
    ),
    check(
      "article_asset_sha256_check",
      sql`${table.sha256} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      "article_asset_status_check",
      sql`${table.status} in ('uploading', 'temporary', 'active', 'pending_delete', 'deleted')`,
    ),
  ],
);
