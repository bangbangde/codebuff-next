import type {
  ArticleCreateValues,
  PublishArticleValues,
} from "./article-dto";
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

export type ArticlePublishFormState = Readonly<{
  conflictRevision: number | null;
  fieldErrors: Partial<
    Record<keyof PublishArticleValues, readonly string[]>
  >;
  formError: string | null;
  values: PublishArticleValues;
}>;

export const initialArticlePublishFormState: ArticlePublishFormState = {
  conflictRevision: null,
  fieldErrors: {},
  formError: null,
  values: {
    categoryName: "",
    coverAssetId: "",
    summary: "",
    tagNames: [],
  },
};
