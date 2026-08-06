import "server-only";

import { and, asc, eq, inArray, lte, ne } from "drizzle-orm";

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
  // 过滤已删除和正在删除的资产：Garage 对象已不存在或正在被移除，
  // 不应出现在封面候选列表中。
  const rows = await getDatabase()
    .select()
    .from(articleAsset)
    .where(
      and(
        eq(articleAsset.articleId, articleId),
        ne(articleAsset.status, "deleted"),
        ne(articleAsset.status, "deleting"),
      ),
    )
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
 * 原子性地 claim 一个资产进入 `deleting` 独占态（仅在状态仍为
 * temporary/pending_delete 时成功）。用于 cleanup 任务：在真正删除
 * Garage 对象之前 claim 成 `deleting` 中间态，让保存/发布事务无法
 * 将该资产复活为 `active`，从而避免 TOCTOU。
 *
 * claim 成 `deleting` 后，调用方负责删除 Garage 对象并调用
 * `markAssetAsDeleted`（成功）或 `releaseAssetClaim`（失败回退）。
 *
 * @returns claim 成功的资产记录；若状态已变更（如被引用方复活）返回 null。
 */
export async function claimAssetForDeletion(
  assetId: string,
  expectedStatuses: readonly ("pending_delete" | "temporary")[],
): Promise<ArticleAsset | null> {
  const [updated] = await getDatabase()
    .update(articleAsset)
    .set({ status: "deleting", statusUpdatedAt: new Date() })
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
 * 将 `deleting` 资产标记为 `deleted`（Garage 对象已删除，记录保留用于审计）。
 * 仅在 Garage 对象成功删除后调用。
 *
 * @returns 更新后的资产记录；若状态已不在 `deleting`（被其他流程变更）返回 null。
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
        eq(articleAsset.status, "deleting"),
      ),
    )
    .returning();

  return updated ? toArticleAsset(updated) : null;
}

/**
 * Garage 删除失败时将 `deleting` 资产回退为 `pending_delete`，
 * 等待下一次 cleanup 重试。回退到 `pending_delete`（而非 temporary）
 * 是保守选择：即使资产原本是 temporary 孤儿，回退后仍受 24h 宽限保护。
 */
export async function releaseAssetClaim(
  assetId: string,
): Promise<ArticleAsset | null> {
  const [updated] = await getDatabase()
    .update(articleAsset)
    .set({ status: "pending_delete", statusUpdatedAt: new Date() })
    .where(
      and(
        eq(articleAsset.id, assetId),
        eq(articleAsset.status, "deleting"),
      ),
    )
    .returning();

  return updated ? toArticleAsset(updated) : null;
}
