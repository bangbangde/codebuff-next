import { z } from "zod";

import { articleFieldLimits, type ArticleCreateValues } from "./article-dto";

export const articleCreateSchema = z.object({
  bodyMarkdown: z
    .string()
    .max(
      articleFieldLimits.bodyMarkdown,
      `Markdown 正文不能超过 ${articleFieldLimits.bodyMarkdown} 个字符。`,
    ),
  title: z
    .string()
    .max(
      articleFieldLimits.title,
      `标题不能超过 ${articleFieldLimits.title} 个字符。`,
    ),
});

export const articleIdSchema = z.string().uuid();

export const articleMutationReferenceSchema = z.object({
  articleId: articleIdSchema,
  expectedRevision: z.coerce.number().int().positive(),
});

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeArticleCreateValues(
  values: ArticleCreateValues,
): ArticleCreateValues {
  return {
    bodyMarkdown: values.bodyMarkdown,
    title: normalizeText(values.title),
  };
}

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export function readArticleValues(formData: FormData): ArticleCreateValues {
  return normalizeArticleCreateValues({
    bodyMarkdown: readText(formData, "bodyMarkdown"),
    title: readText(formData, "title"),
  });
}
