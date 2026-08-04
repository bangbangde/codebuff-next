import { z } from "zod";

import {
  articleFieldLimits,
  type ArticleCreateValues,
  type PublishArticleValues,
} from "./article-dto";

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

export const tagNameSchema = z
  .string()
  .min(1, "标签不能为空。")
  .max(
    articleFieldLimits.tagName,
    `标签不能超过 ${articleFieldLimits.tagName} 个字符。`,
  );

export const publishArticleSchema = z.object({
  categoryName: z
    .string()
    .max(
      articleFieldLimits.categoryName,
      `分类不能超过 ${articleFieldLimits.categoryName} 个字符。`,
    ),
  coverAssetId: z.string().uuid("请选择封面图。"),
  summary: z
    .string()
    .min(1, "摘要不能为空。")
    .max(
      articleFieldLimits.summary,
      `摘要不能超过 ${articleFieldLimits.summary} 个字符。`,
    ),
  tagNames: z
    .array(tagNameSchema)
    .max(20, "单篇笔记最多 20 个标签。"),
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

export function normalizePublishValues(
  values: PublishArticleValues,
): PublishArticleValues {
  return {
    categoryName: normalizeText(values.categoryName),
    coverAssetId: values.coverAssetId,
    summary: normalizeText(values.summary),
    tagNames: values.tagNames
      .map((name) => normalizeText(name))
      .filter((name) => name.length > 0),
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

export function readPublishValues(formData: FormData): PublishArticleValues {
  return normalizePublishValues({
    categoryName: readText(formData, "categoryName"),
    coverAssetId: readText(formData, "coverAssetId"),
    summary: readText(formData, "summary"),
    tagNames: formData.getAll("tagNames").filter(
      (value): value is string => typeof value === "string",
    ),
  });
}
