import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import {
  article,
  articleAsset,
  category,
  tag,
} from "@/lib/db/schema";
import type {
  ArticleDetail,
  ArticleSummary,
  CategoryOption,
  CreatedArticle,
  DeleteArticleInput,
  DeleteArticleResult,
  TagOption,
  UpdateArticleInput,
  UpdateArticleResult,
} from "../article-dto";
import { ArticleAssetUnavailableError } from "../article-errors";
import type { ArticleRepository } from "../article-repository";

async function readCurrentRevision(id: string) {
  const [current] = await getDatabase()
    .select({ revision: article.draftRevision })
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  return current?.revision ?? null;
}

async function readArticleDetail(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  id: string,
): Promise<ArticleDetail | null> {
  const [row] = await transaction
    .select({
      categoryId: article.categoryId,
      content: article.content,
      coverAssetId: article.coverAssetId,
      createdAt: article.createdAt,
      draftContent: article.draftContent,
      draftRevision: article.draftRevision,
      draftTitle: article.draftTitle,
      draftUpdatedAt: article.draftUpdatedAt,
      id: article.id,
      publishedAt: article.publishedAt,
      publishedFromRevision: article.publishedFromRevision,
      publishedUpdatedAt: article.publishedUpdatedAt,
      summary: article.summary,
      title: article.title,
    })
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    categoryId: row.categoryId,
    content: row.content,
    coverAssetId: row.coverAssetId,
    createdAt: row.createdAt.toISOString(),
    draftContent: row.draftContent,
    draftRevision: row.draftRevision,
    draftTitle: row.draftTitle,
    draftUpdatedAt: row.draftUpdatedAt.toISOString(),
    id: row.id,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishedFromRevision: row.publishedFromRevision,
    publishedUpdatedAt: row.publishedUpdatedAt?.toISOString() ?? null,
    summary: row.summary,
    title: row.title,
  };
}

export const drizzleArticleRepository: ArticleRepository = {
  async createDraft(): Promise<CreatedArticle> {
    const today = new Date().toISOString().slice(0, 10);
    const [created] = await getDatabase()
      .insert(article)
      .values({ draftTitle: `未命名文章 ${today}` })
      .returning({ id: article.id });

    if (!created) {
      throw new Error("Article insert did not return the created record.");
    }

    return created;
  },

  async delete(input: DeleteArticleInput): Promise<DeleteArticleResult> {
    const [deleted] = await getDatabase()
      .delete(article)
      .where(
        and(
          eq(article.id, input.id),
          eq(article.draftRevision, input.expectedRevision),
        ),
      )
      .returning({ id: article.id });

    if (deleted) {
      return { status: "deleted" };
    }

    const currentRevision = await readCurrentRevision(input.id);

    return currentRevision === null
      ? { status: "not_found" }
      : { currentRevision, status: "conflict" };
  },

  async findById(id: string): Promise<ArticleDetail | null> {
    return getDatabase().transaction(async (transaction) =>
      readArticleDetail(transaction, id),
    );
  },

  async listSummaries(): Promise<readonly ArticleSummary[]> {
    const rows = await getDatabase()
      .select({
        draftRevision: article.draftRevision,
        draftTitle: article.draftTitle,
        draftUpdatedAt: article.draftUpdatedAt,
        id: article.id,
        publishedAt: article.publishedAt,
      })
      .from(article)
      .orderBy(
        desc(article.draftUpdatedAt),
        asc(article.draftTitle),
      );

    return rows.map((row) => ({
      draftRevision: row.draftRevision,
      draftTitle: row.draftTitle,
      draftUpdatedAt: row.draftUpdatedAt.toISOString(),
      id: row.id,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  },

  async listCategories(): Promise<readonly CategoryOption[]> {
    const rows = await getDatabase()
      .select({ id: category.id, name: category.name })
      .from(category)
      .orderBy(asc(category.name));

    return rows;
  },

  async listTags(): Promise<readonly TagOption[]> {
    const rows = await getDatabase()
      .select({ id: tag.id, name: tag.name })
      .from(tag)
      .orderBy(asc(tag.name));

    return rows;
  },

  async update(
    input: UpdateArticleInput,
    assetIds: readonly string[],
  ): Promise<UpdateArticleResult> {
    return getDatabase().transaction(async (transaction) => {
      if (assetIds.length > 0) {
        const referencedAssets = await transaction
          .select({
            articleId: articleAsset.articleId,
            id: articleAsset.id,
          })
          .from(articleAsset)
          .where(inArray(articleAsset.id, [...assetIds]));

        if (
          referencedAssets.length !== assetIds.length ||
          referencedAssets.some((asset) => asset.articleId !== input.id)
        ) {
          throw new ArticleAssetUnavailableError();
        }
      }

      const [updated] = await transaction
        .update(article)
        .set({
          draftContent: input.bodyMarkdown,
          draftRevision: sql`${article.draftRevision} + 1`,
          draftTitle: input.title,
          draftUpdatedAt: new Date(),
        })
        .where(
          and(
            eq(article.id, input.id),
            eq(article.draftRevision, input.expectedRevision),
          ),
        )
        .returning({ id: article.id });

      if (!updated) {
        const currentRevision = await readCurrentRevision(input.id);

        return currentRevision === null
          ? { status: "not_found" as const }
          : {
              currentRevision,
              status: "conflict" as const,
            };
      }

      const detail = await readArticleDetail(transaction, input.id);

      if (!detail) {
        throw new Error("Updated article could not be reloaded.");
      }

      return {
        article: detail,
        status: "updated" as const,
      };
    });
  },
};
