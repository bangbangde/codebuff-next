import { CheckCircle2Icon, FileTextIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { ArticleSummary } from "@/features/articles/article-dto";
import { listArticleSummaries } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Articles",
  description: "Review unpublished articles stored in PostgreSQL.",
};

function formatUpdatedAt(article: ArticleSummary) {
  return new Intl.DateTimeFormat(article.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(article.updatedAt));
}

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string | string[] }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const articles = await listArticleSummaries();
  const articleCreated = query.created === "1";

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <header className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:gap-8">
        <div className="max-w-3xl">
          <p className="font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
            Admin / Articles
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            文章管理
          </h1>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
            这里展示存储在 PostgreSQL
            中的未发布文章。创建内容不会同步到公开站点，也不会自动发布。
          </p>
        </div>
        <Link
          className={buttonVariants({
            className: "w-full sm:mt-7 sm:w-auto",
          })}
          href="/admin/articles/new"
        >
          <PlusIcon aria-hidden="true" />
          创建文章
        </Link>
      </header>

      {articleCreated ? (
        <div
          className="mt-8 flex items-start gap-3 rounded-lg border border-brand-accent/35 bg-brand-accent-soft px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <CheckCircle2Icon
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand-accent"
          />
          <p>文章已保存到 PostgreSQL，目前仍处于未发布状态。</p>
        </div>
      ) : null}

      <section
        aria-labelledby="article-list-title"
        className="mt-10 border-t border-border pt-7 sm:mt-12 sm:pt-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
              PostgreSQL source
            </p>
            <h2
              className="mt-2 text-xl font-semibold tracking-[-0.025em]"
              id="article-list-title"
            >
              未发布文章
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {articles.length} {articles.length === 1 ? "article" : "articles"}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted px-5 py-10 sm:px-8 sm:py-12">
            <FileTextIcon
              aria-hidden="true"
              className="size-6 text-brand-accent"
            />
            <h3 className="mt-5 text-base font-semibold">还没有文章</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              数据库中暂无文章记录。创建第一篇未发布文章，开始建立后续管理内容。
            </p>
            <Link
              className={buttonVariants({
                className: "mt-6",
                size: "sm",
                variant: "outline",
              })}
              href="/admin/articles/new"
            >
              <PlusIcon aria-hidden="true" />
              创建第一篇文章
            </Link>
          </div>
        ) : (
          <ol className="mt-6 divide-y divide-border border-y border-border">
            {articles.map((article) => (
              <li
                className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"
                key={article.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="text-base font-semibold">{article.title}</h3>
                    <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
                      {article.language}
                    </span>
                  </div>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">
                    /{article.slug}
                  </p>
                  {article.summary ? (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {article.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1">
                  <span>{article.kind}</span>
                  <time dateTime={article.updatedAt}>
                    {formatUpdatedAt(article)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
