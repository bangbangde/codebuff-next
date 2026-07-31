import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";
import { articleIdSchema } from "@/features/articles/article-validation";
import { getPublishedArticle } from "@/features/articles/server/article-service";

type ArticlePageProps = {
  params: Promise<{ articleId: string }>;
};

export const dynamic = "force-dynamic";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { articleId } = await params;

  if (!articleIdSchema.safeParse(articleId).success) {
    return { title: "Not Found" };
  }

  const article = await getPublishedArticle(articleId);

  if (!article) {
    return { title: "Not Found" };
  }

  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function PublishedArticlePage({
  params,
}: ArticlePageProps) {
  const { articleId } = await params;

  if (!articleIdSchema.safeParse(articleId).success) {
    notFound();
  }

  const article = await getPublishedArticle(articleId);

  if (!article) {
    notFound();
  }

  return (
    <main id="main-content">
      <article>
        <ContentContainer>
          <header className="border-b border-border pb-[clamp(3.5rem,8vw,6.5rem)]">
            <p className="mt-8 mb-0 font-mono text-xs leading-body tracking-label text-brand-accent uppercase">
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
            <h1 className="mt-5 mb-0 max-w-[18ch] text-[clamp(2.35rem,6.2vw,5.25rem)] leading-[1.04] font-[550] tracking-[-0.055em] text-balance">
              {article.title}
            </h1>

            {article.tags.length > 0 ? (
              <ul
                aria-label="标签"
                className="mt-7 mb-0 flex flex-wrap gap-1.5"
              >
                {article.tags.map((tag) => (
                  <li
                    className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                    key={tag}
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <div className="mx-auto max-w-[var(--layout-reading)] py-[clamp(3.5rem,8vw,7rem)]">
            <MarkdownRenderer
              resolveAssetUrl={(assetId) =>
                `/api/articles/${article.id}/assets/${assetId}/content`
              }
            >
              {article.content}
            </MarkdownRenderer>
          </div>
        </ContentContainer>
      </article>
    </main>
  );
}
