import "server-only";

import { and, asc, eq, inArray, lte, ne } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { article, articleAsset } from "@/lib/db/schema";
import type {
  ArticleAsset,
  CreateArticleAssetInput,
} from "../article-asset-dto";

function toArticleAsset(row: typeof articleAsset.$inferSelect): ArticleAsset {
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
      and(eq(articleAsset.id, assetId), eq(articleAsset.articleId, articleId)),
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
      ),
    )
    .orderBy(asc(articleAsset.createdAt));

  return rows.map(toArticleAsset);
}

/**
 * 将资产标记为 `deleted`（记录保留用于审计）。
 * 在删除 Garage 对象前调用，不保证 Garage 对象已删除。
 *
 * @returns 更新后的资产记录；若状态已不在 `pending_delete`（被其他流程变更）返回空数组。
 */
export async function markAssetsAsDeleted(
  olderThan: Date,
  limit: number,
): Promise<ArticleAsset[]> {
  return getDatabase().transaction(async (transaction) => {
    const rows = await transaction
      .select({ id: articleAsset.id })
      .from(articleAsset)
      .where(
        and(
          inArray(articleAsset.status, ["pending_delete", "temporary"]),
          lte(articleAsset.statusUpdatedAt, olderThan),
        ),
      )
      .orderBy(asc(articleAsset.statusUpdatedAt), asc(articleAsset.id))
      .for("update")
      .limit(limit);

    if (rows.length === 0) {
      return [];
    }

    const result = await transaction
      .update(articleAsset)
      .set({ status: "deleted", statusUpdatedAt: new Date() })
      .where(
        inArray(
          articleAsset.id,
          rows.map((row) => row.id),
        ),
      )
      .returning();

    return result.map(toArticleAsset);
  });
}
