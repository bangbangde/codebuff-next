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
  articleMutationReferenceSchema,
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
  const reference = articleMutationReferenceSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedRevision: formData.get("expectedRevision"),
  });
  const fields = articleCreateSchema.safeParse(values);

  if (!reference.success) {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "笔记标识或版本无效，请重新载入后再试。",
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
        formError: "笔记尚未保存，请检查 Markdown 正文。",
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
        formError: "笔记尚未保存，请移除无效资产引用。",
        savedRevision: null,
        status: "error",
        values: fields.data,
      };
    }

    console.error("Failed to update note.", error);

    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "笔记暂时无法保存，请稍后重试。",
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
        "数据库中的笔记已被其他操作更新。你的输入仍保留在当前页面，重新载入前不会覆盖新版本。",
      savedRevision: null,
      status: "conflict",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "这篇笔记已不存在，当前内容未保存。",
      savedRevision: null,
      status: "not_found",
      values: fields.data,
    };
  }

  revalidatePath("/admin/notes");
  revalidatePath(`/admin/notes/${reference.data.articleId}`);

  return {
    conflictRevision: null,
    fieldErrors: {},
    formError: null,
    savedRevision: result.article.draftRevision,
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
  const reference = articleMutationReferenceSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedRevision: formData.get("expectedRevision"),
  });
  const fields = publishArticleSchema.safeParse(values);

  if (!reference.success) {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "笔记标识或版本无效，请重新载入后再试。",
      status: "error",
      values,
    };
  }

  if (!fields.success) {
    return {
      conflictRevision: null,
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
      expectedRevision: reference.data.expectedRevision,
      id: reference.data.articleId,
    });
  } catch (error) {
    if (error instanceof ArticleAssetUnavailableError) {
      return {
        conflictRevision: null,
        fieldErrors: {},
        formError: "发布未完成：正文或封面引用了不属于本文或已不存在的资产。",
        status: "error",
        values: fields.data,
      };
    }

    if (error instanceof ArticleAssetReferenceSyntaxError) {
      return {
        conflictRevision: null,
        fieldErrors: {},
        formError: "发布未完成：正文中的托管资产引用格式无效。",
        status: "error",
        values: fields.data,
      };
    }

    console.error("Failed to publish note.", error);

    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "笔记暂时无法发布，请稍后重试。",
      status: "error",
      values: fields.data,
    };
  }

  if (result.status === "conflict") {
    return {
      conflictRevision: result.currentRevision,
      fieldErrors: {},
      formError:
        "数据库中的笔记草稿已被更新。请重新载入页面，确认最新草稿后再发布。",
      status: "conflict",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "这篇笔记已不存在，无法发布。",
      status: "not_found",
      values: fields.data,
    };
  }

  revalidatePath("/admin/notes");
  revalidatePath(`/admin/notes/${reference.data.articleId}`);
  revalidatePath("/");
  revalidatePath("/notes");
  revalidatePath(`/notes/${reference.data.articleId}`);

  return {
    conflictRevision: null,
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
