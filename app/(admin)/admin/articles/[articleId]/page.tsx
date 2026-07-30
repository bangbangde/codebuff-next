import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DatabaseIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import type { ArticleCreateValues } from "@/features/articles/article-dto";
import { articleIdSchema } from "@/features/articles/article-validation";
import { getArticleById } from "@/features/articles/server/article-service";
import { listReadyMediaReferenceOptions } from "@/features/media/server/media-service";
import { requireAdmin } from "@/lib/auth/session";
import { ArticleDeleteDialog } from "./_components/article-delete-dialog";
import { ArticleEditForm } from "./_components/article-edit-form";

export const metadata: Metadata = {
  title: "Edit article",
  description: "Edit an unpublished PostgreSQL-backed article.",
};

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ArticleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ articleId: string }>;
  searchParams: Promise<{ saved?: string | string[] }>;
}) {
  await requireAdmin();

  const route = articleIdSchema.safeParse((await params).articleId);

  if (!route.success) {
    notFound();
  }

  const [article, mediaOptions, query] = await Promise.all([
    getArticleById(route.data),
    listReadyMediaReferenceOptions(),
    searchParams,
  ]);

  if (!article) {
    notFound();
  }

  const values: ArticleCreateValues = {
    bodyMarkdown: article.bodyMarkdown,
    kind: article.kind,
    language: article.language,
    slug: article.slug,
    summary: article.summary,
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
          更改只会保存到 PostgreSQL。保存时会校验当前修订，过期页面不会覆盖更新后的内容。
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <DatabaseIcon aria-hidden="true" className="size-3.5" />
            修订 {article.revision}
          </span>
          <time dateTime={article.updatedAt}>
            更新于 {formatDate(article.updatedAt, article.language)}
          </time>
        </div>
      </header>

      {query.saved === "1" ? (
        <div
          className="mt-8 flex items-start gap-3 rounded-lg border border-brand-accent/35 bg-brand-accent-soft px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <CheckCircle2Icon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-accent"
          />
          <p>更改已保存，文章仍处于未发布状态。</p>
        </div>
      ) : null}

      <ArticleEditForm
        article={article}
        key={article.revision}
        mediaOptions={mediaOptions}
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
