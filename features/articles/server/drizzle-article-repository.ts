import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, not, sql } from "drizzle-orm";

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
import { parseCanonicalAssetReferenceIds } from "../article-asset-reference";
import type { ArticleRepository } from "../article-repository";

async function resolveCategoryId(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
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
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
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
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
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

type DbTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

/**
 * 在事务内锁定并校验被引用的资产行。
 *
 * 使用 SELECT ... FOR UPDATE 锁定资产行，防止 cleanup 在校验后、
 * 事务提交前将资产 claim 为 `deleted` 并删除 Garage 对象。
 *
 * assetIds 会被去重并排序，保证多事务间的锁顺序一致，降低死锁概率。
 *
 * 校验规则：
 * - 所有 assetId 必须存在且属于当前文章；
 * - 资产状态不能是`deleted`
 *
 * @param requireImageAssetId 若提供，则校验该资产必须是图片类型（封面图）。
 * @throws ArticleAssetUnavailableError 校验失败时抛出。
 */
async function lockAndValidateAssets(
  transaction: DbTransaction,
  articleId: string,
  assetIds: readonly string[],
  requireImageAssetId?: string | null,
): Promise<void> {
  if (assetIds.length === 0) {
    return;
  }

  // 去重并排序，保证锁顺序一致
  const sortedIds = [...new Set(assetIds)].sort();

  const rows = await transaction
    .select({
      articleId: articleAsset.articleId,
      id: articleAsset.id,
      mediaType: articleAsset.mediaType,
      status: articleAsset.status,
    })
    .from(articleAsset)
    .where(inArray(articleAsset.id, sortedIds))
    .for("update");

  if (
    rows.length !== sortedIds.length ||
    rows.some((asset) => asset.articleId !== articleId) ||
    rows.some((asset) => asset.status === "deleted")
  ) {
    throw new ArticleAssetUnavailableError();
  }

  if (requireImageAssetId) {
    const coverAsset = rows.find((asset) => asset.id === requireImageAssetId);
    if (coverAsset && !coverAsset.mediaType.startsWith("image/")) {
      throw new ArticleAssetUnavailableError();
    }
  }
}

/**
 * 同步文章资产引用状态：
 * 1. 将被引用的资产从 temporary/pending_delete 提升为 active
 * 2. 将不再被引用的 active 资产降级为 pending_delete
 *
 * "被引用"包括：草稿正文引用 + 线上正文引用 + 封面图引用。
 * 必须在与文章更新同一事务内调用，保证引用关系与资产状态一致。
 */
async function syncAssetStatuses(
  transaction: DbTransaction,
  articleId: string,
  referencedAssetIds: readonly string[],
): Promise<void> {
  // 合并线上槽位的引用（封面 + 已发布正文），确保草稿编辑不会误降级线上资产。
  const [published] = await transaction
    .select({ content: article.content, coverAssetId: article.coverAssetId })
    .from(article)
    .where(eq(article.id, articleId))
    .limit(1);

  const allReferencedIds = new Set<string>(referencedAssetIds);

  if (published) {
    if (published.coverAssetId) {
      allReferencedIds.add(published.coverAssetId);
    }
    if (published.content) {
      for (const id of parseCanonicalAssetReferenceIds(published.content)) {
        allReferencedIds.add(id);
      }
    }
  }

  const referencedList = [...allReferencedIds];

  if (referencedList.length > 0) {
    await transaction
      .update(articleAsset)
      .set({ status: "active", statusUpdatedAt: new Date() })
      .where(
        and(
          eq(articleAsset.articleId, articleId),
          inArray(articleAsset.id, referencedList),
          inArray(articleAsset.status, ["temporary", "pending_delete"]),
        ),
      );
  }

  const unreferencedActiveCondition =
    referencedList.length > 0
      ? and(
          eq(articleAsset.articleId, articleId),
          eq(articleAsset.status, "active"),
          not(inArray(articleAsset.id, referencedList)),
        )
      : and(
          eq(articleAsset.articleId, articleId),
          eq(articleAsset.status, "active"),
        );

  await transaction
    .update(articleAsset)
    .set({ status: "pending_delete", statusUpdatedAt: new Date() })
    .where(unreferencedActiveCondition);
}

export const drizzleArticleRepository: ArticleRepository = {
  async createDraft(): Promise<CreatedArticle> {
    const today = new Date().toISOString().slice(0, 10);
    const [created] = await getDatabase()
      .insert(article)
      .values({ draftTitle: `未命名笔记 ${today}` })
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
      .orderBy(desc(article.draftUpdatedAt), asc(article.draftTitle));

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
      // 锁定文章行，建立统一锁顺序（article → assets），防止与 cleanup/publish 死锁。
      const [locked] = await transaction
        .select({ id: article.id })
        .from(article)
        .where(eq(article.id, input.id))
        .for("update")
        .limit(1);

      if (!locked) {
        return { status: "not_found" as const };
      }

      await lockAndValidateAssets(transaction, input.id, assetIds);

      const [updated] = await transaction
        .update(article)
        .set({
          draftContent: input.bodyMarkdown,
          draftRevision: sql`${article.draftRevision} + 1`,
          draftSequence: input.sequence,
          draftSessionId: input.sessionId,
          draftTitle: input.title,
          draftUpdatedAt: new Date(),
        })
        .where(
          and(
            eq(article.id, input.id),
            // 拒绝同一会话内的旧序号写入：若 DB 已记录该 session 的更高序号，
            // 说明更新的请求已先到达，当前请求是过时的（如 pagehide 与
            // autosave 乱序）。跨会话（sessionId 不同）恒允许，仍 last write wins。
            sql`NOT (${article.draftSessionId} = ${input.sessionId} AND ${article.draftSequence} >= ${input.sequence})`,
          ),
        )
        .returning({ id: article.id });

      if (!updated) {
        // 文章已锁定确认存在，WHERE 因序号条件未命中，视为 ignored。
        return { status: "ignored" as const };
      }

      await syncAssetStatuses(transaction, input.id, assetIds);

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

  async publish(input: PublishArticleInput): Promise<PublishArticleResult> {
    return getDatabase().transaction(async (transaction) => {
      const [locked] = await transaction
        .select({
          draftContent: article.draftContent,
          id: article.id,
        })
        .from(article)
        .where(eq(article.id, input.id))
        .for("update")
        .limit(1);

      if (!locked) {
        return { status: "not_found" as const };
      }

      // 在事务内从确切快照解析资产引用，避免事务外读取导致的过期校验。
      const assetIds = [
        ...new Set([
          ...parseCanonicalAssetReferenceIds(locked.draftContent),
          ...(input.coverAssetId ? [input.coverAssetId] : []),
        ]),
      ];

      if (assetIds.length > 0) {
        // 锁定并校验引用的资产行（FOR UPDATE），与 update 方法复用同一逻辑。
        await lockAndValidateAssets(
          transaction,
          input.id,
          assetIds,
          input.coverAssetId,
        );
      }

      const categoryId =
        input.categoryName.length > 0
          ? await resolveCategoryId(transaction, input.categoryName)
          : null;
      const tagIds = await resolveTagIds(transaction, input.tagNames);

      // 将锁定的草稿快照复制到线上槽位，publishedAt 仅在首次发布时写入。
      // publishedFromRevision 记录发布时的草稿修订（与 draftRevision 相等）。
      const [updated] = await transaction
        .update(article)
        .set({
          content: locked.draftContent,
          coverAssetId: input.coverAssetId,
          publishedAt: sql`coalesce(${article.publishedAt}, now())`,
          publishedFromRevision: sql`${article.draftRevision}`,
          publishedUpdatedAt: new Date(),
          summary: input.summary,
          title: sql`${article.draftTitle}`,
          categoryId,
        })
        .where(eq(article.id, input.id))
        .returning({ id: article.id });

      if (!updated) {
        return { status: "not_found" as const };
      }

      // 这是更新文章标签的标准做法： 先删后插 （delete-all-then-reinsert）。
      // 文章和标签是多对多关系（ articleTag 关联表）。发布时用户可能增删改标签，
      // 计算差异（新增了哪些、删除了哪些）逻辑复杂且容易出错。
      await transaction
        .delete(articleTag)
        .where(eq(articleTag.articleId, input.id));

      if (tagIds.length > 0) {
        await transaction
          .insert(articleTag)
          .values(tagIds.map((tagId) => ({ articleId: input.id, tagId })));
      }

      // 同步资产引用状态：发布时同样需要更新资产引用（封面图）
      await syncAssetStatuses(transaction, input.id, assetIds);

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
    const database = getDatabase();
    const rows = await database
      .select({
        categoryName: category.name,
        coverAssetId: article.coverAssetId,
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

    if (rows.length === 0) {
      return [];
    }

    const tagRows = await database
      .select({ articleId: articleTag.articleId, name: tag.name })
      .from(articleTag)
      .innerJoin(tag, eq(articleTag.tagId, tag.id))
      .where(
        inArray(
          articleTag.articleId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(tag.name));

    const tagsByArticleId = new Map<string, string[]>();

    for (const tagRow of tagRows) {
      const names = tagsByArticleId.get(tagRow.articleId) ?? [];
      names.push(tagRow.name);
      tagsByArticleId.set(tagRow.articleId, names);
    }

    return rows.map((row) => ({
      categoryName: row.categoryName,
      coverAssetId: row.coverAssetId,
      id: row.id,
      publishedAt: row.publishedAt?.toISOString() ?? "",
      publishedUpdatedAt: row.publishedUpdatedAt?.toISOString() ?? "",
      summary: row.summary,
      tags: tagsByArticleId.get(row.id) ?? [],
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
