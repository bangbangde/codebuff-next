export type ArticleAssetUploadFormState = Readonly<{
  formError: string | null;
  uploadedId: string | null;
}>;

export const initialArticleAssetUploadFormState: ArticleAssetUploadFormState =
  {
    formError: null,
    uploadedId: null,
  };

export type ArticleAssetDeleteFormState = Readonly<{
  formError: string | null;
}>;

export const initialArticleAssetDeleteFormState: ArticleAssetDeleteFormState =
  {
    formError: null,
  };
