import type { Metadata } from "next";
import Link from "next/link";

import { ContentContainer } from "@/app/(site)/_components/content-container";
import { listPublishedArticles } from "@/features/articles/server/article-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notes",
  description: "CQ’s Lab 公开发布的 Notes。",
};

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(new Date(date));
}

export default async function NotesPage() {
  const notes = await listPublishedArticles();

  return (
    <main className="flex-1" id="main-content">
      <ContentContainer className="py-[clamp(3rem,7vw,6rem)]">
        <header className="max-w-2xl">
          <p className="font-mono text-xs tracking-label text-brand-accent uppercase">Published thoughts</p>
          <h1 className="mt-3 text-[clamp(2.75rem,7vw,5.5rem)] leading-none font-[550] tracking-[-0.055em]">Notes</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">关于 Vibe Coding、电子 DIY、航模，以及持续搭建中的个人实验。</p>
        </header>

        <section className="mt-[clamp(3rem,7vw,6rem)]" aria-labelledby="notes-list-title">
          <h2 className="sr-only" id="notes-list-title">全部 Notes</h2>
          {notes.length === 0 ? (
            <p className="border-y border-border py-8 text-sm text-muted-foreground">还没有公开 Notes。</p>
          ) : (
            <ol className="divide-y divide-border border-y border-border">
              {notes.map((note) => (
                <li className="py-7" key={note.id}>
                  <article>
                    <p className="font-mono text-xs tracking-label text-muted-foreground uppercase">
                      <time dateTime={note.publishedAt}>{formatPublishDate(note.publishedAt)}</time>
                      {note.categoryName ? <> · {note.categoryName}</> : null}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                      <Link className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/notes/${note.id}`}>{note.title}</Link>
                    </h2>
                    {note.summary ? <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{note.summary}</p> : null}
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
