"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ArticleCreateFormState } from "@/features/articles/article-create-form-state";
import { ArticleSlugConflictError } from "@/features/articles/article-errors";
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
