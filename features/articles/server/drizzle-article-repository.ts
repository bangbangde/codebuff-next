import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import {
  article,
  articleMediaReference,
  mediaAsset,
} from "@/lib/db/schema";
import type {
  ArticleDetail,
  ArticleSummary,
  CreateArticleInput,
  CreatedArticle,
  DeleteArticleInput,
  DeleteArticleResult,
  UpdateArticleInput,
  UpdateArticleResult,
} from "../article-dto";
import {
  ArticleMediaUnavailableError,
  ArticleSlugConflictError,
} from "../article-errors";
import type { ArticleRepository } from "../article-repository";

function isDuplicateSlugError(error: unknown) {
  let candidate = error;

  for (let depth = 0; depth < 2; depth += 1) {
    if (!candidate || typeof candidate !== "object") {
      return false;
    }

    const postgresError = candidate as {
      cause?: unknown;
      code?: unknown;
      constraint?: unknown;
    };

    if (
      postgresError.code === "23505" &&
      postgresError.constraint === "article_slug_unique"
    ) {
      return true;
    }

    candidate = postgresError.cause;
  }

  return false;
}

const articleDetailSelection = {
  bodyMarkdown: article.bodyMarkdown,
  createdAt: article.createdAt,
  id: article.id,
  kind: article.kind,
  language: article.language,
  revision: article.revision,
  slug: article.slug,
  summary: article.summary,
  title: article.title,
  updatedAt: article.updatedAt,
};

function toArticleDetail(
  row: typeof article.$inferSelect,
): ArticleDetail {
  return {
    ...row,
    language: row.language as ArticleDetail["language"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readCurrentRevision(id: string) {
  const [current] = await getDatabase()
    .select({ revision: article.revision })
    .from(article)
    .where(eq(article.id, id))
    .limit(1);

  return current?.revision ?? null;
}

export const drizzleArticleRepository: ArticleRepository = {
  async create(
    input: CreateArticleInput,
    mediaIds: readonly string[],
  ): Promise<CreatedArticle> {
    try {
      return await getDatabase().transaction(async (transaction) => {
        if (mediaIds.length > 0) {
          const referencedMedia = await transaction
            .select({
              id: mediaAsset.id,
              status: mediaAsset.status,
            })
            .from(mediaAsset)
            .where(inArray(mediaAsset.id, [...mediaIds]));

          if (
            referencedMedia.length !== mediaIds.length ||
            referencedMedia.some((media) => media.status !== "ready")
          ) {
            throw new ArticleMediaUnavailableError();
          }
        }

        const [created] = await transaction
          .insert(article)
          .values(input)
          .returning({
            id: article.id,
            slug: article.slug,
          });

        if (!created) {
          throw new Error("Article insert did not return the created record.");
        }

        if (mediaIds.length > 0) {
          await transaction.insert(articleMediaReference).values(
            mediaIds.map((mediaId) => ({
              articleId: created.id,
              mediaId,
            })),
          );
        }

        return created;
      });
    } catch (error) {
      if (isDuplicateSlugError(error)) {
        throw new ArticleSlugConflictError(input.slug);
      }

      throw error;
    }
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
    const [row] = await getDatabase()
      .select(articleDetailSelection)
      .from(article)
      .where(eq(article.id, id))
      .limit(1);

    return row ? toArticleDetail(row) : null;
  },

  async listSummaries(): Promise<readonly ArticleSummary[]> {
    const rows = await getDatabase()
      .select({
        id: article.id,
        kind: article.kind,
        language: article.language,
        revision: article.revision,
        slug: article.slug,
        summary: article.summary,
        title: article.title,
        updatedAt: article.updatedAt,
      })
      .from(article)
      .orderBy(desc(article.updatedAt), asc(article.slug));

    return rows.map((row) => ({
      ...row,
      language: row.language as ArticleSummary["language"],
      updatedAt: row.updatedAt.toISOString(),
    }));
  },

  async update(
    input: UpdateArticleInput,
    mediaIds: readonly string[],
  ): Promise<UpdateArticleResult> {
    try {
      return await getDatabase().transaction(async (transaction) => {
        const [updated] = await transaction
          .update(article)
          .set({
            bodyMarkdown: input.bodyMarkdown,
            kind: input.kind,
            language: input.language,
            revision: sql`${article.revision} + 1`,
            slug: input.slug,
            summary: input.summary,
            title: input.title,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(article.id, input.id),
              eq(article.revision, input.expectedRevision),
            ),
          )
          .returning(articleDetailSelection);

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

        if (mediaIds.length > 0) {
          const referencedMedia = await transaction
            .select({
              id: mediaAsset.id,
              status: mediaAsset.status,
            })
            .from(mediaAsset)
            .where(inArray(mediaAsset.id, [...mediaIds]));

          if (
            referencedMedia.length !== mediaIds.length ||
            referencedMedia.some((media) => media.status !== "ready")
          ) {
            throw new ArticleMediaUnavailableError();
          }
        }

        await transaction
          .delete(articleMediaReference)
          .where(eq(articleMediaReference.articleId, input.id));

        if (mediaIds.length > 0) {
          await transaction.insert(articleMediaReference).values(
            mediaIds.map((mediaId) => ({
              articleId: input.id,
              mediaId,
            })),
          );
        }

        return {
          article: toArticleDetail(updated),
          status: "updated" as const,
        };
      });
    } catch (error) {
      if (isDuplicateSlugError(error)) {
        throw new ArticleSlugConflictError(input.slug);
      }

      throw error;
    }
  },
};
