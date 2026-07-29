import { z } from "zod";

import {
  articleFieldLimits,
  articleLanguages,
  type ArticleCreateValues,
} from "./article-dto";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleCreateSchema = z.object({
  bodyMarkdown: z
    .string()
    .max(
      articleFieldLimits.bodyMarkdown,
      `Markdown 正文不能超过 ${articleFieldLimits.bodyMarkdown} 个字符。`,
    ),
  kind: z
    .string()
    .min(1, "请输入文章类型。")
    .max(
      articleFieldLimits.kind,
      `文章类型不能超过 ${articleFieldLimits.kind} 个字符。`,
    ),
  language: z.enum(articleLanguages, {
    error: "请选择支持的文章语言。",
  }),
  slug: z
    .string()
    .min(1, "请输入 slug。")
    .max(
      articleFieldLimits.slug,
      `Slug 不能超过 ${articleFieldLimits.slug} 个字符。`,
    )
    .regex(slugPattern, "Slug 只能使用小写字母、数字和单个连字符。"),
  summary: z
    .string()
    .max(
      articleFieldLimits.summary,
      `摘要不能超过 ${articleFieldLimits.summary} 个字符。`,
    ),
  title: z
    .string()
    .min(1, "请输入文章标题。")
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
  return value.trim();
}

export function normalizeArticleCreateValues(
  values: ArticleCreateValues,
): ArticleCreateValues {
  return {
    bodyMarkdown: values.bodyMarkdown,
    kind: normalizeText(values.kind),
    language: normalizeText(values.language),
    slug: normalizeText(values.slug).toLowerCase(),
    summary: normalizeText(values.summary),
    title: normalizeText(values.title),
  };
}

function readText(formData: FormData, field: keyof ArticleCreateValues) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

export function readArticleValues(formData: FormData): ArticleCreateValues {
  return normalizeArticleCreateValues({
    bodyMarkdown: readText(formData, "bodyMarkdown"),
    kind: readText(formData, "kind"),
    language: readText(formData, "language"),
    slug: readText(formData, "slug"),
    summary: readText(formData, "summary"),
    title: readText(formData, "title"),
  });
}
