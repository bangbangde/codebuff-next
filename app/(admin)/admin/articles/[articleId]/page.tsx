import { ArrowLeftIcon, DatabaseIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
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
import { ArticleDeleteDialog } from "./_components/article-delete-dialog";
import { ArticleEditForm } from "./_components/article-edit-form";

export const metadata: Metadata = {
  title: "Edit article",
  description: "Edit an unpublished PostgreSQL-backed article.",
};

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  await requireAdmin();

  const route = articleIdSchema.safeParse((await params).articleId);

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
    bodyMarkdown: article.bodyMarkdown,
    categoryName: article.categoryName ?? "",
    tagNames: article.tagNames,
    title: article.title,
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground no-underline transition-colors duration-(--motion-duration) ease-(--motion-easing) hover:text-foreground focus-visible:text-foreground motion-reduce:transition-none"
        href="/admin/articles"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        返回文章列表
      </Link>

      <header className="mt-6 max-w-3xl">
        <p className="font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
          Admin / Articles / Edit
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          编辑文章
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
          更改会自动保存到 PostgreSQL。保存时会校验当前修订，过期页面不会覆盖更新后的内容。
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <DatabaseIcon aria-hidden="true" className="size-3.5" />
            修订 {article.revision}
          </span>
        </div>
      </header>

      <ArticleEditForm
        article={{ id: article.id, revision: article.revision }}
        assets={assets}
        categories={categories}
        tags={tags}
        values={values}
      />

      <section
        aria-labelledby="delete-article-title"
        className="mt-12 border-t border-destructive/25 pt-8"
      >
        <div className="grid gap-5 rounded-lg border border-destructive/25 bg-destructive/5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7">
          <div>
            <h2 className="text-base font-semibold" id="delete-article-title">
              删除未发布文章
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              删除会永久移除 PostgreSQL 中的这条记录。确认前请核对文章名称与最新修订。
            </p>
          </div>
          <ArticleDeleteDialog
            articleId={article.id}
            revision={article.revision}
            title={article.title}
          />
        </div>
      </section>
    </div>
  );
}
