import type {
  ArticleDetail,
  ArticleSummary,
  CreateArticleInput,
  CreatedArticle,
  DeleteArticleInput,
  DeleteArticleResult,
  UpdateArticleInput,
  UpdateArticleResult,
} from "./article-dto";

export interface ArticleRepository {
  create(input: CreateArticleInput): Promise<CreatedArticle>;
  delete(input: DeleteArticleInput): Promise<DeleteArticleResult>;
  findById(id: string): Promise<ArticleDetail | null>;
  listSummaries(): Promise<readonly ArticleSummary[]>;
  update(input: UpdateArticleInput): Promise<UpdateArticleResult>;
}
