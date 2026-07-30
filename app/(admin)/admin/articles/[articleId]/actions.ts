"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type {
  ArticleDeleteFormState,
  ArticleEditFormState,
} from "@/features/articles/article-edit-form-state";
import {
  ArticleMediaUnavailableError,
  ArticleSlugConflictError,
} from "@/features/articles/article-errors";
import { ArticleMediaReferenceSyntaxError } from "@/features/articles/article-media-reference";
import {
  articleCreateSchema,
  articleMutationReferenceSchema,
  readArticleValues,
} from "@/features/articles/article-validation";
import {
  deleteArticle,
  updateArticle,
} from "@/features/articles/server/article-service";
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
      values,
    };
  }

  if (!fields.success) {
    return {
      conflictRevision: null,
      fieldErrors: fields.error.flatten().fieldErrors,
      formError: "请检查标出的字段后再保存。",
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
    if (error instanceof ArticleMediaReferenceSyntaxError) {
      return {
        conflictRevision: null,
        fieldErrors: {
          bodyMarkdown: ["托管媒体引用格式无效，请重新从媒体选择器插入。"],
        },
        formError: "文章尚未保存，请检查 Markdown 正文。",
        values: fields.data,
      };
    }

    if (error instanceof ArticleMediaUnavailableError) {
      return {
        conflictRevision: null,
        fieldErrors: {
          bodyMarkdown: ["正文引用了不存在或尚未可用的媒体。"],
        },
        formError: "文章尚未保存，请移除无效媒体引用。",
        values: fields.data,
      };
    }

    if (error instanceof ArticleSlugConflictError) {
      return {
        conflictRevision: null,
        fieldErrors: {
          slug: ["这个 slug 已被其他文章使用。"],
        },
        formError: "文章尚未保存，请更换 slug。",
        values: fields.data,
      };
    }

    console.error("Failed to update article.", error);

    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "文章暂时无法保存，请稍后重试。",
      values: fields.data,
    };
  }

  if (result.status === "conflict") {
    return {
      conflictRevision: result.currentRevision,
      fieldErrors: {},
      formError:
        "数据库中的文章已被其他操作更新。你的输入仍保留在当前页面，重新载入前不会覆盖新版本。",
      values: fields.data,
    };
  }

  if (result.status === "not_found") {
    return {
      conflictRevision: null,
      fieldErrors: {},
      formError: "这篇文章已不存在，当前内容未保存。",
      values: fields.data,
    };
  }

  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${reference.data.articleId}`);
  redirect(`/admin/articles/${reference.data.articleId}?saved=1`);
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
