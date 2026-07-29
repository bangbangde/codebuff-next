import "server-only";

import { asc, desc } from "drizzle-orm";

import { getDatabase } from "@/lib/db/client";
import { article } from "@/lib/db/schema";
import type { ArticleSummary } from "../article-dto";
import type { ArticleRepository } from "../article-repository";

export const drizzleArticleRepository: ArticleRepository = {
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
