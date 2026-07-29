import type { ArticleSummary } from "./article-dto";

export interface ArticleRepository {
  listSummaries(): Promise<readonly ArticleSummary[]>;
}
