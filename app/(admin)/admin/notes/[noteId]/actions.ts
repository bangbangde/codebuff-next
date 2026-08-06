"use server";

import { revalidatePath } from "next/cache";

import type {
  ArticleEditFormState,
  ArticlePublishFormState,
} from "@/features/articles/article-edit-form-state";
import { ArticleAssetUnavailableError } from "@/features/articles/article-errors";
import { ArticleAssetReferenceSyntaxError } from "@/features/articles/article-asset-reference";
import {
  articleCreateSchema,
  articleIdSchema,
  publishArticleSchema,
  readArticleValues,
  readPublishValues,
} from "@/features/articles/article-validation";
import { publishArticle, updateArticle } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";

export async function updateArticleAction(
  _previousState: ArticleEditFormState,
  formData: FormData,
): Promise<ArticleEditFormState> {
  await requireAdmin();

  const values = readArticleValues(formData);
  const articleId = articleIdSchema.safeParse(formData.get("articleId"));
  const fields = articleCreateSchema.safeParse(values);

  if (!articleId.success) {
    return {
      fieldErrors: {},
      formError: "笔记标识无效，请重新载入后再试。",
      status: "error",
      values,
    };
  }

  if (!fields.success) {
    return {
      fieldErrors: fields.error.flatten().fieldErrors,
      formError: "请检查标出的字段后再保存。",
      status: "error",
      values,
    };
  }

  let result: Awaited<ReturnType<typeof updateArticle>>;

  try {
    result = await updateArticle({
      ...fields.data,
      id: articleId.data,
    });
  } catch (error) {
    if (error instanceof ArticleAssetReferenceSyntaxError) {
      return {
        fieldErrors: {
          bodyMarkdown: ["托管资产引用格式无效，请重新从资产插入。"],
        },
        formError: "笔记尚未保存，请检查 Markdown 正文。",
        status: "error",
        values: fields.data,
      };
    }

    if (error instanceof ArticleAssetUnavailableError) {
      return {
        fieldErrors: {
          bodyMarkdown: ["正文引用了不属于本文或不存在的资产。"],
        },
        formError: "笔记尚未保存，请移除无效资产引用。",
        status: "error",
        values: fields.data,
      };
    }

    console.error("Failed to update note.", error);

    return {
      fieldErrors: {},
      formError: "笔记暂时无法保存，请稍后重试。",
      status: "error",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      fieldErrors: {},
      formError: "这篇笔记已不存在，当前内容未保存。",
      status: "not_found",
      values: fields.data,
    };
  }

  revalidatePath("/admin/notes");
  revalidatePath(`/admin/notes/${articleId.data}`);

  return {
    fieldErrors: {},
    formError: null,
    status: "saved",
    values: fields.data,
  };
}

export async function publishArticleAction(
  _previousState: ArticlePublishFormState,
  formData: FormData,
): Promise<ArticlePublishFormState> {
  await requireAdmin();

  const values = readPublishValues(formData);
  const articleId = articleIdSchema.safeParse(formData.get("articleId"));
  const fields = publishArticleSchema.safeParse(values);

  if (!articleId.success) {
    return {
      fieldErrors: {},
      formError: "笔记标识无效，请重新载入后再试。",
      status: "error",
      values,
    };
  }

  if (!fields.success) {
    return {
      fieldErrors: fields.error.flatten().fieldErrors,
      formError: "请检查发布信息后再提交。",
      status: "error",
      values,
    };
  }

  let result: Awaited<ReturnType<typeof publishArticle>>;

  try {
    result = await publishArticle({
      ...fields.data,
      id: articleId.data,
    });
  } catch (error) {
    if (error instanceof ArticleAssetUnavailableError) {
      return {
        fieldErrors: {},
        formError: "发布未完成：正文或封面引用了不属于本文或已不存在的资产。",
        status: "error",
        values: fields.data,
      };
    }

    if (error instanceof ArticleAssetReferenceSyntaxError) {
      return {
        fieldErrors: {},
        formError: "发布未完成：正文中的托管资产引用格式无效。",
        status: "error",
        values: fields.data,
      };
    }

    console.error("Failed to publish note.", error);

    return {
      fieldErrors: {},
      formError: "笔记暂时无法发布，请稍后重试。",
      status: "error",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      fieldErrors: {},
      formError: "这篇笔记已不存在，无法发布。",
      status: "not_found",
      values: fields.data,
    };
  }

  revalidatePath("/admin/notes");
  revalidatePath(`/admin/notes/${articleId.data}`);
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath(`/notes/${articleId.data}`);

  return {
    fieldErrors: {},
    formError: null,
    status: "published",
    values: {
      categoryName: fields.data.categoryName,
      coverAssetId: result.article.coverAssetId ?? "",
      summary: result.article.summary,
      tagNames: fields.data.tagNames,
    },
  };
}
