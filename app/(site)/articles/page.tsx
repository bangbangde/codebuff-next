import type { Metadata } from "next";
import Link from "next/link";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { listPublishedArticles } from "@/features/articles/server/article-service";

export const metadata: Metadata = {
  title: "Articles",
  description: "已发布的技术文章与笔记。",
};

export const dynamic = "force-dynamic";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default async function ArticlesIndexPage() {
  const articles = await listPublishedArticles();

  return (
    <main id="main-content">
      <ContentContainer>
        <header className="border-b border-border pt-[clamp(2.5rem,6vw,5rem)] pb-[clamp(3rem,6vw,5rem)]">
          <p className="font-mono text-xs leading-body tracking-label text-brand-accent uppercase">
            Articles
          </p>
          <h1 className="mt-5 mb-0 max-w-[18ch] text-[clamp(2.35rem,6.2vw,5.25rem)] leading-[1.04] font-[550] tracking-[-0.055em] text-balance">
            已发布文章
          </h1>
          <p className="mt-7 mb-0 max-w-[42rem] text-[clamp(1.08rem,2vw,1.3rem)] leading-[1.75] text-muted-foreground">
            来自数据库的线上版本。草稿只在管理后台可见，发布后才会出现在这里。
          </p>
        </header>

        <section
          aria-labelledby="published-articles-title"
          className="py-[clamp(3rem,6vw,5rem)]"
        >
          <h2
            className="sr-only"
            id="published-articles-title"
          >
            已发布文章列表
          </h2>

          {articles.length === 0 ? (
            <p className="text-sm leading-7 text-muted-foreground">
              还没有已发布文章。请在管理后台发布一篇文章后再回来查看。
            </p>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {articles.map((article) => (
                <li className="py-7" key={article.id}>
                  <article className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                    <div className="min-w-0">
                      <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
                        <time dateTime={article.publishedAt}>
                          {formatPublishDate(article.publishedAt)}
                        </time>
                        {article.categoryName ? (
                          <>
                            {" · "}
                            <span>{article.categoryName}</span>
                          </>
                        ) : null}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.025em]">
                        <Link
                          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          href={`/articles/${article.id}`}
                        >
                          {article.title}
                        </Link>
                      </h3>
                      {article.summary.length > 0 ? (
                        <p className="mt-3 max-w-[42rem] text-sm leading-7 text-muted-foreground">
                          {article.summary}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      </ContentContainer>
    </main>
  );
}
