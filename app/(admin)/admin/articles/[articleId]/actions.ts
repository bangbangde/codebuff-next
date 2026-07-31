"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  ArticleDeleteFormState,
  ArticleEditFormState,
} from "@/features/articles/article-edit-form-state";
import { ArticleAssetUnavailableError } from "@/features/articles/article-errors";
import { ArticleAssetReferenceSyntaxError } from "@/features/articles/article-asset-reference";
import {
  articleCreateSchema,
  articleMutationReferenceSchema,
  readArticleValues,
} from "@/features/articles/article-validation";
import {
  deleteArticle,
  updateArticle,
} from "@/features/articles/server/article-service";
import type {
  ArticleAssetDeleteFormState,
  ArticleAssetUploadFormState,
} from "@/features/article-assets/article-asset-form-state";
import {
  ArticleNotFoundError,
  AssetNotFoundError,
  AssetStorageError,
  AssetValidationError,
} from "@/features/article-assets/article-asset-errors";
import {
  assetIdParamSchema,
  articleIdParamSchema,
} from "@/features/article-assets/article-asset-validation";
import {
  deleteArticleAsset,
  uploadArticleAsset,
} from "@/features/article-assets/server/article-asset-service";
import { requireAdmin } from "@/lib/auth/session";

export async function updateArticleAction(
  _previousState: ArticleEditFormState,
  formData: FormData,
): Promise<ArticleEditFormState> {
  await requireAdmin();

  const values = readArticleValues(formData);
  const reference = articleMutationReferenceSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedRevision: formData.get("expectedRevision"),
  });
  const fields = articleCreateSchema.safeParse(values);

  if (!reference.success) {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "文章标识或版本无效，请重新载入后再试。",
      savedRevision: null,
      status: "error",
      values,
    };
  }

  if (!fields.success) {
    return {
      conflictRevision: null,
      fieldErrors: fields.error.flatten().fieldErrors,
      formError: "请检查标出的字段后再保存。",
      savedRevision: null,
      status: "error",
      values,
    };
  }

  let result: Awaited<ReturnType<typeof updateArticle>>;

  try {
    result = await updateArticle({
      ...fields.data,
      expectedRevision: reference.data.expectedRevision,
      id: reference.data.articleId,
    });
  } catch (error) {
    if (error instanceof ArticleAssetReferenceSyntaxError) {
      return {
        conflictRevision: null,
        fieldErrors: {
          bodyMarkdown: ["托管资产引用格式无效，请重新从资产插入。"],
        },
        formError: "文章尚未保存，请检查 Markdown 正文。",
        savedRevision: null,
        status: "error",
        values: fields.data,
      };
    }

    if (error instanceof ArticleAssetUnavailableError) {
      return {
        conflictRevision: null,
        fieldErrors: {
          bodyMarkdown: ["正文引用了不属于本文或不存在的资产。"],
        },
        formError: "文章尚未保存，请移除无效资产引用。",
        savedRevision: null,
        status: "error",
        values: fields.data,
      };
    }

    console.error("Failed to update article.", error);

    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "文章暂时无法保存，请稍后重试。",
      savedRevision: null,
      status: "error",
      values: fields.data,
    };
  }

  if (result.status === "conflict") {
    return {
      conflictRevision: result.currentRevision,
      fieldErrors: {},
      formError:
        "数据库中的文章已被其他操作更新。你的输入仍保留在当前页面，重新载入前不会覆盖新版本。",
      savedRevision: null,
      status: "conflict",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "这篇文章已不存在，当前内容未保存。",
      savedRevision: null,
      status: "not_found",
      values: fields.data,
    };
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${reference.data.articleId}`);

  return {
    conflictRevision: null,
    fieldErrors: {},
    formError: null,
    savedRevision: result.article.revision,
    status: "saved",
    values: fields.data,
  };
}

export async function deleteArticleAction(
  _previousState: ArticleDeleteFormState,
  formData: FormData,
): Promise<ArticleDeleteFormState> {
  await requireAdmin();

  const reference = articleMutationReferenceSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedRevision: formData.get("expectedRevision"),
  });

  if (!reference.success) {
    return {
      conflictRevision: null,
      formError: "文章标识或版本无效，删除已拒绝。",
    };
  }

  let result: Awaited<ReturnType<typeof deleteArticle>>;

  try {
    result = await deleteArticle({
      expectedRevision: reference.data.expectedRevision,
      id: reference.data.articleId,
    });
  } catch (error) {
    console.error("Failed to delete article.", error);

    return {
      conflictRevision: null,
      formError: "文章暂时无法删除，请稍后重试。",
    };
  }

  if (result.status === "conflict") {
    return {
      conflictRevision: result.currentRevision,
      formError:
        "数据库中的文章已更新，当前删除请求已拒绝。请重新载入并检查最新内容。",
    };
  }

  if (result.status === "not_found") {
    return {
      conflictRevision: null,
      formError: "这篇文章已不存在，没有执行删除。",
    };
  }

  revalidatePath("/admin/articles");
  redirect("/admin/articles?deleted=1");
}

export async function uploadArticleAssetAction(
  _previousState: ArticleAssetUploadFormState,
  formData: FormData,
): Promise<ArticleAssetUploadFormState> {
  await requireAdmin();

  const route = articleIdParamSchema.safeParse(formData.get("articleId"));

  if (!route.success) {
    return {
      formError: "文章标识无效，请重新载入后再试。",
      uploadedId: null,
    };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return {
      formError: "请选择要上传的文件。",
      uploadedId: null,
    };
  }

  try {
    const asset = await uploadArticleAsset(route.data, file);

    revalidatePath(`/admin/articles/${route.data}`);

    return {
      formError: null,
      uploadedId: asset.id,
    };
  } catch (error) {
    if (error instanceof AssetValidationError) {
      return {
        formError: error.message,
        uploadedId: null,
      };
    }

    if (error instanceof ArticleNotFoundError) {
      return {
        formError: "这篇文章已不存在，无法上传资产。",
        uploadedId: null,
      };
    }

    if (error instanceof AssetStorageError) {
      return {
        formError: "资产存储暂时不可用，请稍后重试。",
        uploadedId: null,
      };
    }

    console.error("Failed to upload article asset.", error);

    return {
      formError: "资产暂时无法上传，请稍后重试。",
      uploadedId: null,
    };
  }
}

export async function deleteArticleAssetAction(
  _previousState: ArticleAssetDeleteFormState,
  formData: FormData,
): Promise<ArticleAssetDeleteFormState> {
  await requireAdmin();

  const articleRoute = articleIdParamSchema.safeParse(
    formData.get("articleId"),
  );
  const assetRoute = assetIdParamSchema.safeParse(formData.get("assetId"));

  if (!articleRoute.success || !assetRoute.success) {
    return {
      formError: "资产标识无效，删除已拒绝。",
    };
  }

  try {
    await deleteArticleAsset(articleRoute.data, assetRoute.data);

    revalidatePath(`/admin/articles/${articleRoute.data}`);

    return {
      formError: null,
    };
  } catch (error) {
    if (error instanceof AssetNotFoundError) {
      return {
        formError: "这个资产已不存在，没有执行删除。",
      };
    }

    console.error("Failed to delete article asset.", error);

    return {
      formError: "资产暂时无法删除，请稍后重试。",
    };
  }
}
