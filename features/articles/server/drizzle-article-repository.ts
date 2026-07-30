import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

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
    .select({ revision: article.revision })
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  return current?.revision ?? null;
}

async function resolveCategoryId(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  categoryName: string,
): Promise<string | null> {
  if (categoryName.length === 0) {
    return null;
  }

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

  return tagNames.map((name) => existingByLowerName.get(name.toLowerCase()) as string);
}

async function readArticleDetail(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  id: string,
): Promise<ArticleDetail | null> {
  const [row] = await transaction
    .select({
      bodyMarkdown: article.bodyMarkdown,
      categoryId: article.categoryId,
      createdAt: article.createdAt,
      id: article.id,
      revision: article.revision,
      title: article.title,
      updatedAt: article.updatedAt,
    })
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  if (!row) {
    return null;
  }

  const categoryName = row.categoryId
    ? await transaction
        .select({ name: category.name })
        .from(category)
        .where(eq(category.id, row.categoryId))
        .limit(1)
        .then((result) => result[0]?.name ?? null)
    : null;

  const tagRows = await transaction
    .select({ name: tag.name })
    .from(articleTag)
    .innerJoin(tag, eq(articleTag.tagId, tag.id))
    .where(eq(articleTag.articleId, id));

  return {
    bodyMarkdown: row.bodyMarkdown,
    categoryName,
    createdAt: row.createdAt.toISOString(),
    id: row.id,
    revision: row.revision,
    tagNames: tagRows.map((row) => row.name),
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const drizzleArticleRepository: ArticleRepository = {
  async createDraft(): Promise<CreatedArticle> {
    const today = new Date().toISOString().slice(0, 10);
    const [created] = await getDatabase()
      .insert(article)
      .values({ title: `未命名文章 ${today}` })
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
          eq(article.revision, input.expectedRevision),
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
    const database = getDatabase();
    const rows = await database
      .select({
        categoryId: article.categoryId,
        id: article.id,
        revision: article.revision,
        title: article.title,
        updatedAt: article.updatedAt,
      })
      .from(article)
      .orderBy(desc(article.updatedAt), asc(article.title));

    if (rows.length === 0) {
      return [];
    }

    const categoryIds = Array.from(
      new Set(rows.map((row) => row.categoryId).filter(Boolean)),
    ) as string[];
    const articleIds = rows.map((row) => row.id);

    const [categoryRows, tagRows] = await Promise.all([
      categoryIds.length > 0
        ? database
            .select({ id: category.id, name: category.name })
            .from(category)
            .where(inArray(category.id, categoryIds))
        : Promise.resolve([]),
      database
        .select({
          articleId: articleTag.articleId,
          name: tag.name,
        })
        .from(articleTag)
        .innerJoin(tag, eq(articleTag.tagId, tag.id))
        .where(inArray(articleTag.articleId, articleIds)),
    ]);

    const categoryNameById = new Map(
      categoryRows.map((row) => [row.id, row.name]),
    );
    const tagNamesByArticleId = new Map<string, string[]>();

    for (const row of tagRows) {
      const list = tagNamesByArticleId.get(row.articleId) ?? [];
      list.push(row.name);
      tagNamesByArticleId.set(row.articleId, list);
    }

    return rows.map((row) => ({
      categoryName: row.categoryId
        ? (categoryNameById.get(row.categoryId) ?? null)
        : null,
      id: row.id,
      revision: row.revision,
      tagNames: tagNamesByArticleId.get(row.id) ?? [],
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
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

      const categoryId = await resolveCategoryId(
        transaction,
        input.categoryName,
      );
      const tagIds = await resolveTagIds(transaction, input.tagNames);

      const [updated] = await transaction
        .update(article)
        .set({
          bodyMarkdown: input.bodyMarkdown,
          categoryId,
          revision: sql`${article.revision} + 1`,
          title: input.title,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(article.id, input.id),
            eq(article.revision, input.expectedRevision),
          ),
        )
        .returning({ id: article.id });

      if (!updated) {
        const [current] = await transaction
          .select({ revision: article.revision })
          .from(article)
          .where(eq(article.id, input.id))
          .limit(1);

        return current
          ? {
              currentRevision: current.revision,
              status: "conflict" as const,
            }
          : { status: "not_found" as const };
      }

      await transaction
        .delete(articleTag)
        .where(eq(articleTag.articleId, input.id));

      if (tagIds.length > 0) {
        await transaction
          .insert(articleTag)
          .values(tagIds.map((tagId) => ({ articleId: input.id, tagId })));
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
