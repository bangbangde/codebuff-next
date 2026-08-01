import Link from "next/link";

import { ContentContainer } from "./_components/content-container";
import { listPublishedArticles } from "@/features/articles/server/article-service";

export const dynamic = "force-dynamic";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export default async function Home() {
  const notes = (await listPublishedArticles()).slice(0, 3);

  return (
    <main className="flex flex-1 flex-col" id="main-content">
      <section
        className="bg-[radial-gradient(circle_at_calc(50%-min(26rem,32vw))_9%,rgba(184,93,22,0.045),transparent_28rem)]"
        aria-labelledby="landing-title"
      >
        <ContentContainer className="grid min-h-0 content-center pt-[clamp(3rem,4.5vw,4rem)] pb-[clamp(2.75rem,4vw,3.5rem)] [@media(max-width:40rem)]:pt-6 [@media(max-width:40rem)]:pb-4">
          <h1
            className="m-0 max-w-none text-[clamp(2.9rem,4.5vw,4.5rem)] leading-[0.98] font-[540] tracking-[-0.057em] text-balance [@media(max-width:40rem)]:max-w-[12ch] [@media(max-width:40rem)]:text-[clamp(2.65rem,11.8vw,3.35rem)] [@media(max-width:40rem)]:tracking-[-0.052em]"
            id="landing-title"
          >
            <span className="inline-block">嗨，这里是</span>{" "}
            <span
              className="ml-[0.16em] inline-block text-brand-accent [@media(max-width:40rem)]:ml-[0.12em]"
              lang="en"
            >
              CQ’s Lab
            </span>
          </h1>
          <p className="mt-8 mb-0 text-[0.94rem] leading-normal tracking-[0.012em] text-muted-foreground [@media(max-width:40rem)]:mt-3 [@media(max-width:40rem)]:text-[0.82rem]">
            Vibe Coding / 电子 DIY / 航模
          </p>
          <p
            className="mt-3 mb-0 flex items-center gap-3 font-mono text-[0.8125rem] leading-body tracking-[0.015em] text-muted-foreground [@media(max-width:40rem)]:mt-[0.6rem] [@media(max-width:40rem)]:text-xs"
          >
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute -inset-1 animate-ping rounded-full border border-brand-accent opacity-70 [animation-duration:1.8s] [animation-timing-function:cubic-bezier(0,0,0.2,1)] motion-reduce:animate-none motion-reduce:opacity-0" />
              <span className="relative size-2 rounded-full bg-brand-accent shadow-[0_0_0_0.25rem_var(--brand-accent-soft)]" />
            </span>
            <span lang="en">Now</span> · 正在准备网站内容
          </p>
        </ContentContainer>
      </section>

      <ContentContainer className="flex-1 pb-[clamp(3rem,7vw,6rem)]">
        <section id="notes" aria-labelledby="notes-title">
          <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight" id="notes-title" lang="en">
                Notes
              </h2>
            </div>
            <Link className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href="/notes">
              浏览全部
            </Link>
          </div>
          {notes.length === 0 ? (
            <p className="mt-6 mb-0 text-sm leading-7 text-muted-foreground">
              还没有公开 Notes。
            </p>
          ) : (
            <ol className="mt-8 mb-0 divide-y divide-border border-y border-border">
              {notes.map((note) => (
                <li className="py-7" key={note.id}>
                  <article className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
                    <div className="min-w-0">
                      <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
                        <time dateTime={note.publishedAt}>
                          {formatPublishDate(note.publishedAt)}
                        </time>
                        {note.categoryName ? (
                          <>
                            {" · "}
                            <span>{note.categoryName}</span>
                          </>
                        ) : null}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold tracking-tight">
                        <Link
                          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                          href={`/notes/${note.id}`}
                        >
                          {note.title}
                        </Link>
                      </h3>
                      {note.summary.length > 0 ? (
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                          {note.summary}
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
