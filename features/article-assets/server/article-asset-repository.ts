import "server-only";

import { and, asc, eq, inArray, lte } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { article, articleAsset } from "@/lib/db/schema";
import type {
  ArticleAsset,
  CreateArticleAssetInput,
} from "../article-asset-dto";

function toArticleAsset(
  row: typeof articleAsset.$inferSelect,
): ArticleAsset {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    mediaType: row.mediaType as ArticleAsset["mediaType"],
    status: row.status as ArticleAsset["status"],
    statusUpdatedAt: row.statusUpdatedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function articleExists(articleId: string): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ id: article.id })
    .from(article)
    .where(eq(article.id, articleId))
    .limit(1);

  return row !== undefined;
}

export async function createAsset(
  input: CreateArticleAssetInput,
): Promise<ArticleAsset> {
  const [created] = await getDatabase()
    .insert(articleAsset)
    .values(input)
    .returning();

  if (!created) {
    throw new Error("Article asset insert did not return the created record.");
  }

  return toArticleAsset(created);
}

export async function findAssetById(
  articleId: string,
  assetId: string,
): Promise<ArticleAsset | null> {
  const [row] = await getDatabase()
    .select()
    .from(articleAsset)
    .where(
      and(
        eq(articleAsset.id, assetId),
        eq(articleAsset.articleId, articleId),
      ),
    )
    .limit(1);

  return row ? toArticleAsset(row) : null;
}

export async function listAssetsByArticle(
  articleId: string,
): Promise<readonly ArticleAsset[]> {
  const rows = await getDatabase()
    .select()
    .from(articleAsset)
    .where(eq(articleAsset.articleId, articleId))
    .orderBy(asc(articleAsset.createdAt));

  return rows.map(toArticleAsset);
}

/**
 * 列出等待清理的资产：
 * - `pending_delete`：引用已移除，可安全删除 Garage 对象
 * - `temporary`：上传后从未被引用，超过阈值后视为孤儿
 *
 * 按状态更新时间升序排列，优先清理最旧的记录。
 */
export async function listAssetsPendingCleanup(
  statuses: readonly ArticleAsset["status"][],
  olderThan: Date,
  limit: number,
): Promise<readonly ArticleAsset[]> {
  const rows = await getDatabase()
    .select()
    .from(articleAsset)
    .where(
      and(
        inArray(articleAsset.status, [...statuses]),
        lte(articleAsset.statusUpdatedAt, olderThan),
      ),
    )
    .orderBy(asc(articleAsset.statusUpdatedAt))
    .limit(limit);

  return rows.map(toArticleAsset);
}

/**
 * 将资产状态标记为 `deleted`（Garage 对象已删除，记录保留用于审计）。
 * 仅在 Garage 对象成功删除后调用。
 */
export async function markAssetAsDeleted(
  assetId: string,
): Promise<ArticleAsset | null> {
  const [updated] = await getDatabase()
    .update(articleAsset)
    .set({ status: "deleted", statusUpdatedAt: new Date() })
    .where(eq(articleAsset.id, assetId))
    .returning();

  return updated ? toArticleAsset(updated) : null;
}
