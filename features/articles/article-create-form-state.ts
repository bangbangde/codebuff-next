import type { ArticleCreateValues } from "./article-dto";

export type ArticleCreateFieldErrors = Partial<
  Record<keyof ArticleCreateValues, readonly string[]>
>;

export type ArticleCreateFormState = Readonly<{
  fieldErrors: ArticleCreateFieldErrors;
  formError: string | null;
  values: ArticleCreateValues;
}>;

export const initialArticleCreateFormState: ArticleCreateFormState = {
  fieldErrors: {},
  formError: null,
  values: {
    bodyMarkdown: "",
    kind: "",
    language: "zh-CN",
    slug: "",
    summary: "",
    title: "",
  },
};
