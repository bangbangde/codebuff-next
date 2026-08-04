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
 * 原子性地 claim 一个资产可被安全删除（仅在状态仍为 temporary/pending_delete 时成功）。
 * 用于 cleanup 任务：在真正删除 Garage 对象之前 claim 成功，
 * 才能避免 TOCTOU：即 listAssetsPendingCleanup 选中后，用户保存文章
 * 将资产从 pending_delete 复活为 active；若无 claim，后续 store.delete
 * 会删掉正在被引用的对象。
 *
 * 这里采用"先 claim 成中间态再删除"的保守做法：直接把符合条件的行
 * UPDATE 为同一个 status（强制 bump statusUpdatedAt）并 returning。
 * 若 0 行返回，说明该资产已不再处于可清理状态，调用方跳过。
 * （PG 不支持 "UPDATE ... WHERE ... RETURNING" 时无行变化，所以
 * 我们复用 WHERE 条件作为 claim 判定。）
 */
export async function claimAssetForDeletion(
  assetId: string,
  expectedStatuses: readonly ("pending_delete" | "temporary")[],
): Promise<ArticleAsset | null> {
  const [updated] = await getDatabase()
    .update(articleAsset)
    .set({ statusUpdatedAt: new Date() })
    .where(
      and(
        eq(articleAsset.id, assetId),
        inArray(articleAsset.status, [...expectedStatuses]),
      ),
    )
    .returning();

  return updated ? toArticleAsset(updated) : null;
}

/**
 * 将资产状态标记为 `deleted`（Garage 对象已删除，记录保留用于审计）。
 * 仅在 Garage 对象成功删除后调用。
 * 加 `WHERE status IN ('pending_delete', 'temporary')`：
 * 若在此期间用户保存文章并将资产从 pending_delete 重新提升为 active，
 * 该 UPDATE 不会命中，调用方据此跳过标记，避免误删正在被引用的资产。
 *
 * @returns 更新后的资产记录，若无匹配行返回 null（表示状态已被改变，不应继续标记）。
 */
export async function markAssetAsDeleted(
  assetId: string,
): Promise<ArticleAsset | null> {
  const [updated] = await getDatabase()
    .update(articleAsset)
    .set({ status: "deleted", statusUpdatedAt: new Date() })
    .where(
      and(
        eq(articleAsset.id, assetId),
        inArray(articleAsset.status, ["pending_delete", "temporary"]),
      ),
    )
    .returning();

  return updated ? toArticleAsset(updated) : null;
}
