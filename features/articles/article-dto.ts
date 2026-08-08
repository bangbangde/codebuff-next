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
    id: string;
    // 编辑会话标识 + 单调序号，用于拒绝同会话内的旧序号保存请求。
    sessionId: string;
    sequence: number;
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
  | Readonly<{ status: "ignored" }>
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
  }>;

export type PublishArticleResult =
  | Readonly<{ article: ArticleDetail; status: "published" }>
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
