export type ArticleLanguage = "en" | "zh-CN";

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
