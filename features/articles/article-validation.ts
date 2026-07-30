import { z } from "zod";

import { articleFieldLimits, type ArticleCreateValues } from "./article-dto";

const tagNameSchema = z
  .string()
  .min(1, "标签不能为空。")
  .max(
    articleFieldLimits.tagName,
    `标签不能超过 ${articleFieldLimits.tagName} 个字符。`,
  );

export const articleCreateSchema = z.object({
  bodyMarkdown: z
    .string()
    .max(
      articleFieldLimits.bodyMarkdown,
      `Markdown 正文不能超过 ${articleFieldLimits.bodyMarkdown} 个字符。`,
    ),
  categoryName: z
    .string()
    .max(
      articleFieldLimits.categoryName,
      `分类不能超过 ${articleFieldLimits.categoryName} 个字符。`,
    ),
  tagNames: z.array(tagNameSchema).max(20, "单篇文章最多 20 个标签。"),
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
  const seen = new Set<string>();
  const tagNames: string[] = [];

  for (const name of values.tagNames) {
    const trimmed = normalizeText(name);

    if (trimmed.length === 0) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    tagNames.push(trimmed);
  }

  return {
    bodyMarkdown: values.bodyMarkdown,
    categoryName: normalizeText(values.categoryName),
    tagNames,
    title: normalizeText(values.title),
  };
}

function readText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function readTextList(formData: FormData, field: string) {
  const values = formData.getAll(field);
  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export function readArticleValues(formData: FormData): ArticleCreateValues {
  return normalizeArticleCreateValues({
    bodyMarkdown: readText(formData, "bodyMarkdown"),
    categoryName: readText(formData, "categoryName"),
    tagNames: readTextList(formData, "tagNames"),
    title: readText(formData, "title"),
  });
}
