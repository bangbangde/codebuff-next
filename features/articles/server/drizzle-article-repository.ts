import "server-only";

import { asc, desc } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { article } from "@/lib/db/schema";
import type {
  ArticleSummary,
  CreateArticleInput,
  CreatedArticle,
} from "../article-dto";
import { ArticleSlugConflictError } from "../article-errors";
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

export const drizzleArticleRepository: ArticleRepository = {
  async create(input: CreateArticleInput): Promise<CreatedArticle> {
    try {
      const [created] = await getDatabase()
        .insert(article)
        .values(input)
        .returning({
          id: article.id,
          slug: article.slug,
        });

      if (!created) {
        throw new Error("Article insert did not return the created record.");
      }

      return created;
    } catch (error) {
      if (isDuplicateSlugError(error)) {
        throw new ArticleSlugConflictError(input.slug);
      }

      throw error;
    }
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
};
