export const articleFieldLimits = {
  bodyMarkdown: 200_000,
  categoryName: 50,
  summary: 500,
  tagName: 50,
  title: 200,
} as const;

export type ArticleCreateValues = Readonly<{
  bodyMarkdown: string;
  title: string;
}>;

export type CreatedArticle = Readonly<{
  id: string;
}>;

export type UpdateArticleInput = ArticleCreateValues &
  Readonly<{
    expectedRevision: number;
    id: string;
  }>;

export type CategoryOption = Readonly<{
  id: string;
  name: string;
}>;

export type TagOption = Readonly<{
  id: string;
  name: string;
}>;

export type ArticleSummary = Readonly<{
  id: string;
  draftTitle: string;
  draftRevision: number;
  draftUpdatedAt: string;
  publishedAt: string | null;
}>;

export type ArticleDetail = Readonly<{
  id: string;
  draftTitle: string;
  draftContent: string;
  draftRevision: number;
  draftUpdatedAt: string;
  createdAt: string;
  // 线上槽位（首次发布前为 null）
  title: string | null;
  content: string | null;
  summary: string;
  coverAssetId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  tagNames: readonly string[];
  // 发布元数据
  publishedAt: string | null;
  publishedUpdatedAt: string | null;
  publishedFromRevision: number | null;
}>;

export type UpdateArticleResult =
  | Readonly<{ article: ArticleDetail; status: "updated" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;

export type PublishArticleValues = Readonly<{
  summary: string;
  categoryName: string;
  tagNames: readonly string[];
  coverAssetId: string;
}>;

export type PublishArticleInput = PublishArticleValues &
  Readonly<{
    id: string;
    expectedRevision: number; // draftRevision，用于乐观锁
  }>;

export type PublishArticleResult =
  | Readonly<{ article: ArticleDetail; status: "published" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;

// ─── 公开只读视图（仅线上槽位字段，不暴露草稿） ───────────────────

export type PublishedArticleSummary = Readonly<{
  coverAssetId: string | null;
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  publishedUpdatedAt: string;
  categoryName: string | null;
  tags: readonly string[];
}>;

export type PublishedArticleDetail = Readonly<{
  id: string;
  title: string;
  content: string;
  summary: string;
  coverAssetId: string | null;
  publishedAt: string;
  publishedUpdatedAt: string;
  categoryName: string | null;
  tags: readonly string[];
}>;
