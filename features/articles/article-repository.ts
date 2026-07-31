import type {
  ArticleDetail,
  ArticleSummary,
  CategoryOption,
  CreatedArticle,
  DeleteArticleInput,
  DeleteArticleResult,
  PublishArticleInput,
  PublishArticleResult,
  PublishedArticleDetail,
  PublishedArticleSummary,
  TagOption,
  UpdateArticleInput,
  UpdateArticleResult,
} from "./article-dto";

export interface ArticleRepository {
  createDraft(): Promise<CreatedArticle>;
  delete(input: DeleteArticleInput): Promise<DeleteArticleResult>;
  findById(id: string): Promise<ArticleDetail | null>;
  listSummaries(): Promise<readonly ArticleSummary[]>;
  listCategories(): Promise<readonly CategoryOption[]>;
  listTags(): Promise<readonly TagOption[]>;
  update(
    input: UpdateArticleInput,
    assetIds: readonly string[],
  ): Promise<UpdateArticleResult>;
  publish(
    input: PublishArticleInput,
    assetIds: readonly string[],
  ): Promise<PublishArticleResult>;
  listPublishedArticles(): Promise<readonly PublishedArticleSummary[]>;
  getPublishedArticle(id: string): Promise<PublishedArticleDetail | null>;
  isArticlePublished(id: string): Promise<boolean>;
}
