import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { ArticleCreateValues } from "@/features/articles/article-dto";
import { articleIdSchema } from "@/features/articles/article-validation";
import {
  getArticleById,
  listCategories,
  listTags,
} from "@/features/articles/server/article-service";
import { listArticleAssets } from "@/features/article-assets/server/article-asset-service";
import { requireAdmin } from "@/lib/auth/session";
import { NoteEditor } from "../_components/note-editor";

export const metadata: Metadata = {
  title: "Edit note",
  description: "使用全屏编辑器修改笔记。",
};

export default async function NoteEditorPage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  await requireAdmin();

  const route = articleIdSchema.safeParse((await params).noteId);

  if (!route.success) {
    notFound();
  }

  const [article, assets, categories, tags] = await Promise.all([
    getArticleById(route.data),
    listArticleAssets(route.data),
    listCategories(),
    listTags(),
  ]);

  if (!article) {
    notFound();
  }

  const values: ArticleCreateValues = {
    bodyMarkdown: article.draftContent,
    title: article.draftTitle,
  };

  return (
    <NoteEditor
      article={{
        id: article.id,
        revision: article.draftRevision,
        publishedAt: article.publishedAt,
        publishedFromRevision: article.publishedFromRevision,
        coverAssetId: article.coverAssetId,
        summary: article.summary,
        categoryName: article.categoryName,
        tagNames: article.tagNames,
      }}
      assets={assets}
      categories={categories}
      tags={tags}
      initialValues={values}
    />
  );
}
