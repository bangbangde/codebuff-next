import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { listPublishedArticles } from "@/features/articles/server/article-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes",
  description: "CQ’s Lab 公开发布的 Notes。",
};

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

export default async function NotesPage() {
  const notes = await listPublishedArticles();

  return (
    <main className="flex-1" id="main-content">
      <ContentContainer className="py-[clamp(1.5rem,4vw,3rem)]">
        <h1 className="sr-only" lang="en">
          Notes
        </h1>
        <section aria-labelledby="notes-list-title">
          <h2 className="sr-only" id="notes-list-title">
            全部 Notes
          </h2>
          {notes.length === 0 ? (
            <p className="border-y border-border py-8 text-sm text-muted-foreground">
              还没有公开 Notes。
            </p>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {notes.map((note) => (
                <li className="py-5 sm:py-6" key={note.id}>
                  <article
                    className={`group relative ${
                      note.coverAssetId
                        ? "grid grid-cols-[minmax(0,1fr)_5.75rem] gap-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-7"
                        : "block"
                    }`}
                  >
                    <div className="min-w-0">
                      <h2 className="text-[1.125rem] leading-snug font-semibold tracking-[-0.025em] sm:text-[1.35rem]">
                        <Link
                          className="rounded-sm transition-colors duration-[140ms] group-hover:text-brand-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                          href={`/notes/${note.id}`}
                        >
                          {note.title}
                        </Link>
                      </h2>
                      {note.summary ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground sm:line-clamp-1 sm:text-[0.9375rem]">
                          {note.summary}
                        </p>
                      ) : null}
                      <footer className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                        <p className="flex flex-wrap items-center gap-x-2 font-mono text-[0.6875rem] leading-5 text-muted-foreground sm:text-xs">
                          <span>CQ</span>
                          <span aria-hidden="true">·</span>
                          <time dateTime={note.publishedAt}>
                            {formatPublishDate(note.publishedAt)}
                          </time>
                          {note.categoryName ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{note.categoryName}</span>
                            </>
                          ) : null}
                        </p>
                        {note.tags.length > 0 ? (
                          <ul
                            aria-label="标签"
                            className="flex flex-wrap justify-end gap-1.5"
                          >
                            {note.tags.map((tag) => (
                              <li
                                className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.6875rem] leading-4 text-muted-foreground"
                                key={tag}
                              >
                                {tag}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </footer>
                    </div>
                    {note.coverAssetId ? (
                      <div className="relative aspect-[3/2] overflow-hidden rounded-sm border border-border bg-muted">
                        <Image
                          alt=""
                          className="object-cover transition-transform duration-[180ms] group-hover:scale-[1.025] motion-reduce:transition-none"
                          fill
                          sizes="(max-width: 640px) 92px, 144px"
                          src={`/api/notes/${note.id}/assets/${note.coverAssetId}/content`}
                        />
                      </div>
                    ) : null}
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
