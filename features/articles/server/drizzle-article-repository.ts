import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import {
  article,
  articleAsset,
  articleTag,
  category,
  tag,
} from "@/lib/db/schema";
import type {
  ArticleDetail,
  ArticleSummary,
  CategoryOption,
  CreatedArticle,
  PublishArticleInput,
  PublishArticleResult,
  PublishedArticleDetail,
  PublishedArticleSummary,
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

async function resolveCategoryId(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  categoryName: string,
): Promise<string> {
  const lowerName = categoryName.toLowerCase();

  const [existing] = await transaction
    .select({ id: category.id })
    .from(category)
    .where(sql`lower(${category.name}) = ${lowerName}`)
    .limit(1);

  if (existing) {
    return existing.id;
  }

  const [created] = await transaction
    .insert(category)
    .values({ name: categoryName })
    .onConflictDoNothing()
    .returning({ id: category.id });

  if (created) {
    return created.id;
  }

  // 并发创建：另一事务已插入同名分类，复用现有记录
  const [retry] = await transaction
    .select({ id: category.id })
    .from(category)
    .where(sql`lower(${category.name}) = ${lowerName}`)
    .limit(1);

  if (!retry) {
    throw new Error("Category insert did not return the created record.");
  }

  return retry.id;
}

async function resolveTagIds(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  tagNames: readonly string[],
): Promise<readonly string[]> {
  if (tagNames.length === 0) {
    return [];
  }

  const lowerNames = tagNames.map((name) => name.toLowerCase());

  const existing = await transaction
    .select({ id: tag.id, name: tag.name })
    .from(tag)
    .where(inArray(sql`lower(${tag.name})`, lowerNames));

  const existingByLowerName = new Map(
    existing.map((row) => [row.name.toLowerCase(), row.id]),
  );
  const missing = tagNames.filter(
    (name) => !existingByLowerName.has(name.toLowerCase()),
  );

  if (missing.length > 0) {
    const created = await transaction
      .insert(tag)
      .values(missing.map((name) => ({ name })))
      .onConflictDoNothing()
      .returning({ id: tag.id, name: tag.name });

    for (const row of created) {
      existingByLowerName.set(row.name.toLowerCase(), row.id);
    }

    // 并发创建：为 onConflictDoNothing 跳过的标签复用现有记录
    const stillMissing = missing.filter(
      (name) => !existingByLowerName.has(name.toLowerCase()),
    );

    if (stillMissing.length > 0) {
      const retry = await transaction
        .select({ id: tag.id, name: tag.name })
        .from(tag)
        .where(
          inArray(
            sql`lower(${tag.name})`,
            stillMissing.map((n) => n.toLowerCase()),
          ),
        );

      for (const row of retry) {
        existingByLowerName.set(row.name.toLowerCase(), row.id);
      }
    }
  }

  return tagNames.map(
    (name) => existingByLowerName.get(name.toLowerCase()) as string,
  );
}

async function readArticleDetail(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  id: string,
): Promise<ArticleDetail | null> {
  const [row] = await transaction
    .select({
      categoryId: article.categoryId,
      categoryName: category.name,
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
    .leftJoin(category, eq(article.categoryId, category.id))
    .where(eq(article.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const tagRows = await transaction
    .select({ name: tag.name })
    .from(articleTag)
    .innerJoin(tag, eq(articleTag.tagId, tag.id))
    .where(eq(articleTag.articleId, id))
    .orderBy(asc(tag.name));

  return {
    categoryId: row.categoryId,
    categoryName: row.categoryName,
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
    tagNames: tagRows.map((tagRow) => tagRow.name),
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

  async publish(
    input: PublishArticleInput,
    assetIds: readonly string[],
  ): Promise<PublishArticleResult> {
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

      const categoryId = await resolveCategoryId(
        transaction,
        input.categoryName,
      );
      const tagIds = await resolveTagIds(transaction, input.tagNames);

      // 将当前草稿复制到线上槽位，publishedAt 仅在首次发布时写入。
      // publishedFromRevision 记录发布时的草稿修订（与 draftRevision 相等）。
      const [updated] = await transaction
        .update(article)
        .set({
          content: sql`${article.draftContent}`,
          coverAssetId: input.coverAssetId,
          publishedAt: sql`coalesce(${article.publishedAt}, now())`,
          publishedFromRevision: sql`${article.draftRevision}`,
          publishedUpdatedAt: new Date(),
          summary: input.summary,
          title: sql`${article.draftTitle}`,
          categoryId,
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

      await transaction
        .delete(articleTag)
        .where(eq(articleTag.articleId, input.id));

      if (tagIds.length > 0) {
        await transaction.insert(articleTag).values(
          tagIds.map((tagId) => ({ articleId: input.id, tagId })),
        );
      }

      const detail = await readArticleDetail(transaction, input.id);

      if (!detail) {
        throw new Error("Published article could not be reloaded.");
      }

      return {
        article: detail,
        status: "published" as const,
      };
    });
  },

  async listPublishedArticles(): Promise<readonly PublishedArticleSummary[]> {
    const rows = await getDatabase()
      .select({
        categoryName: category.name,
        id: article.id,
        publishedAt: article.publishedAt,
        publishedUpdatedAt: article.publishedUpdatedAt,
        summary: article.summary,
        title: article.title,
      })
      .from(article)
      .leftJoin(category, eq(article.categoryId, category.id))
      .where(isNotNull(article.publishedAt))
      .orderBy(desc(article.publishedUpdatedAt), asc(article.title));

    return rows.map((row) => ({
      categoryName: row.categoryName,
      id: row.id,
      publishedAt: row.publishedAt?.toISOString() ?? "",
      publishedUpdatedAt: row.publishedUpdatedAt?.toISOString() ?? "",
      summary: row.summary,
      title: row.title ?? "",
    }));
  },

  async getPublishedArticle(
    id: string,
  ): Promise<PublishedArticleDetail | null> {
    return getDatabase().transaction(async (transaction) => {
      const [row] = await transaction
        .select({
          content: article.content,
          coverAssetId: article.coverAssetId,
          categoryName: category.name,
          id: article.id,
          publishedAt: article.publishedAt,
          publishedUpdatedAt: article.publishedUpdatedAt,
          summary: article.summary,
          title: article.title,
        })
        .from(article)
        .leftJoin(category, eq(article.categoryId, category.id))
        .where(and(eq(article.id, id), isNotNull(article.publishedAt)))
        .limit(1);

      if (!row) {
        return null;
      }

      const tagRows = await transaction
        .select({ name: tag.name })
        .from(articleTag)
        .innerJoin(tag, eq(articleTag.tagId, tag.id))
        .where(eq(articleTag.articleId, id))
        .orderBy(asc(tag.name));

      return {
        content: row.content ?? "",
        coverAssetId: row.coverAssetId,
        categoryName: row.categoryName,
        id: row.id,
        publishedAt: row.publishedAt?.toISOString() ?? "",
        publishedUpdatedAt: row.publishedUpdatedAt?.toISOString() ?? "",
        summary: row.summary,
        tags: tagRows.map((row) => row.name),
        title: row.title ?? "",
      };
    });
  },

  async isArticlePublished(id: string): Promise<boolean> {
    const [row] = await getDatabase()
      .select({ id: article.id })
      .from(article)
      .where(and(eq(article.id, id), isNotNull(article.publishedAt)))
      .limit(1);

    return row !== undefined;
  },
};
