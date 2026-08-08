import type {
  ArticleCreateValues,
  PublishArticleValues,
} from "./article-dto";
import type { ArticleFieldErrors } from "./article-create-form-state";

export type ArticleEditFormState = Readonly<{
  fieldErrors: ArticleFieldErrors;
  formError: string | null;
  status: "idle" | "saved" | "not_found" | "error";
  values: ArticleCreateValues;
}>;

export type ArticlePublishFormState = Readonly<{
  fieldErrors: Partial<
    Record<keyof PublishArticleValues, readonly string[]>
  >;
  formError: string | null;
  status: "idle" | "published" | "not_found" | "error";
  values: PublishArticleValues;
}>;

export const initialArticlePublishFormState: ArticlePublishFormState = {
  fieldErrors: {},
  formError: null,
  status: "idle",
  values: {
    categoryName: "",
    coverAssetId: "",
    summary: "",
    tagNames: [],
  },
};
