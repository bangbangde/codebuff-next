import type { ArticleCreateValues } from "./article-dto";
import type { ArticleFieldErrors } from "./article-create-form-state";

export type ArticleEditFormState = Readonly<{
  conflictRevision: number | null;
  fieldErrors: ArticleFieldErrors;
  formError: string | null;
  savedRevision: number | null;
  status: "idle" | "saved" | "conflict" | "not_found" | "error";
  values: ArticleCreateValues;
}>;

export type ArticleDeleteFormState = Readonly<{
  conflictRevision: number | null;
  formError: string | null;
}>;

export const initialArticleDeleteFormState: ArticleDeleteFormState = {
  conflictRevision: null,
  formError: null,
};
