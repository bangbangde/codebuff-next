import type { ArticleCreateValues } from "./article-dto";

export type ArticleFieldErrors = Partial<
  Record<keyof ArticleCreateValues, readonly string[]>
>;

export type ArticleCreateFieldErrors = ArticleFieldErrors;

export type ArticleCreateFormState = Readonly<{
  fieldErrors: ArticleFieldErrors;
  formError: string | null;
  values: ArticleCreateValues;
}>;

export const initialArticleCreateFormState: ArticleCreateFormState = {
  fieldErrors: {},
  formError: null,
  values: {
    bodyMarkdown: "",
    categoryName: "",
    tagNames: [],
    title: "",
  },
};
