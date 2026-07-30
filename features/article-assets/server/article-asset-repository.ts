import "server-only";

import { and, asc, eq } from "drizzle-orm";

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

export async function deleteAssetById(
  articleId: string,
  assetId: string,
): Promise<ArticleAsset | null> {
  const [deleted] = await getDatabase()
    .delete(articleAsset)
    .where(
      and(
        eq(articleAsset.id, assetId),
        eq(articleAsset.articleId, articleId),
      ),
    )
    .returning();

  return deleted ? toArticleAsset(deleted) : null;
}

export async function listObjectKeysByArticle(
  articleId: string,
): Promise<readonly string[]> {
  const rows = await getDatabase()
    .select({ objectKey: articleAsset.objectKey })
    .from(articleAsset)
    .where(eq(articleAsset.articleId, articleId));

  return rows.map((row) => row.objectKey);
}
