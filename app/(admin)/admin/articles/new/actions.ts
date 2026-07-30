"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ArticleCreateFormState } from "@/features/articles/article-create-form-state";
import {
  ArticleMediaUnavailableError,
  ArticleSlugConflictError,
} from "@/features/articles/article-errors";
import { ArticleMediaReferenceSyntaxError } from "@/features/articles/article-media-reference";
import {
  articleCreateSchema,
  readArticleValues,
} from "@/features/articles/article-validation";
import { createArticle } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";

export async function createArticleAction(
  _previousState: ArticleCreateFormState,
  formData: FormData,
): Promise<ArticleCreateFormState> {
  await requireAdmin();

  const values = readArticleValues(formData);
  const parsed = articleCreateSchema.safeParse(values);

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      formError: "请检查标出的字段后再保存。",
      values,
    };
  }

  try {
    await createArticle(parsed.data);
  } catch (error) {
    if (error instanceof ArticleMediaReferenceSyntaxError) {
      return {
        fieldErrors: {
          bodyMarkdown: ["托管媒体引用格式无效，请重新从媒体选择器插入。"],
        },
        formError: "文章尚未保存，请检查 Markdown 正文。",
        values: parsed.data,
      };
    }

    if (error instanceof ArticleMediaUnavailableError) {
      return {
        fieldErrors: {
          bodyMarkdown: ["正文引用了不存在或尚未可用的媒体。"],
        },
        formError: "文章尚未保存，请移除无效媒体引用。",
        values: parsed.data,
      };
    }

    if (error instanceof ArticleSlugConflictError) {
      return {
        fieldErrors: {
          slug: ["这个 slug 已被其他文章使用。"],
        },
        formError: "文章尚未保存，请更换 slug。",
        values: parsed.data,
      };
    }

    console.error("Failed to create article.", error);

    return {
      fieldErrors: {},
      formError: "文章暂时无法保存，请稍后重试。",
      values: parsed.data,
    };
  }

  revalidatePath("/admin/articles");
  redirect("/admin/articles?created=1");
}
