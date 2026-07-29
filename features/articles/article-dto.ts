export const articleLanguages = ["zh-CN", "en"] as const;

export const articleFieldLimits = {
  bodyMarkdown: 200_000,
  kind: 50,
  slug: 160,
  summary: 500,
  title: 200,
} as const;

export type ArticleLanguage = (typeof articleLanguages)[number];

export type ArticleCreateValues = Readonly<{
  bodyMarkdown: string;
  kind: string;
  language: string;
  slug: string;
  summary: string;
  title: string;
}>;

export type CreateArticleInput = Readonly<{
  bodyMarkdown: string;
  kind: string;
  language: ArticleLanguage;
  slug: string;
  summary: string;
  title: string;
}>;

export type CreatedArticle = Readonly<{
  id: string;
  slug: string;
}>;

export type ArticleSummary = Readonly<{
  id: string;
  kind: string;
  language: ArticleLanguage;
  revision: number;
  slug: string;
  summary: string;
  title: string;
  updatedAt: string;
}>;

export type ArticleDetail = Readonly<{
  bodyMarkdown: string;
  createdAt: string;
  id: string;
  kind: string;
  language: ArticleLanguage;
  revision: number;
  slug: string;
  summary: string;
  title: string;
  updatedAt: string;
}>;

export type UpdateArticleInput = CreateArticleInput &
  Readonly<{
    expectedRevision: number;
    id: string;
  }>;

export type DeleteArticleInput = Readonly<{
  expectedRevision: number;
  id: string;
}>;

export type UpdateArticleResult =
  | Readonly<{ article: ArticleDetail; status: "updated" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;

export type DeleteArticleResult =
  | Readonly<{ status: "deleted" }>
  | Readonly<{ currentRevision: number; status: "conflict" }>
  | Readonly<{ status: "not_found" }>;
