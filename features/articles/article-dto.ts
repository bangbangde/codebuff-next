export const articleFieldLimits = {
  bodyMarkdown: 200_000,
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

export type DeleteArticleInput = Readonly<{
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
  // 发布元数据
  publishedAt: string | null;
  publishedUpdatedAt: string | null;
  publishedFromRevision: number | null;
}>;

export type UpdateArticleResult =
  | Readonly<{ article: ArticleDetail; status: "updated" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;

export type DeleteArticleResult =
  | Readonly<{ status: "deleted" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;
