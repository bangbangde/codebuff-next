export const articleFieldLimits = {
  bodyMarkdown: 200_000,
  categoryName: 50,
  tagName: 50,
  title: 200,
} as const;

export type ArticleCreateValues = Readonly<{
  bodyMarkdown: string;
  title: string;
  categoryName: string;
  tagNames: readonly string[];
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
  title: string;
  revision: number;
  categoryName: string | null;
  tagNames: readonly string[];
  updatedAt: string;
}>;

export type ArticleDetail = Readonly<{
  id: string;
  title: string;
  bodyMarkdown: string;
  revision: number;
  categoryName: string | null;
  tagNames: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type UpdateArticleResult =
  | Readonly<{ article: ArticleDetail; status: "updated" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;

export type DeleteArticleResult =
  | Readonly<{ status: "deleted" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;
