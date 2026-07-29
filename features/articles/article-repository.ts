import type {
  ArticleSummary,
  CreateArticleInput,
  CreatedArticle,
} from "./article-dto";

export interface ArticleRepository {
  create(input: CreateArticleInput): Promise<CreatedArticle>;
  listSummaries(): Promise<readonly ArticleSummary[]>;
}
