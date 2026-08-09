import Link from "next/link";

import { ContentContainer } from "./_components/content-container";
import { getPublicHomeContent } from "@/features/home-content/server/public-home-content";
import { MarkdownRenderer } from "@/lib/content/markdown-renderer";

export const dynamic = "force-dynamic";

const sectionLabelClassName =
  "m-0 font-mono text-xs leading-body tracking-label text-brand-ink uppercase";

function formatPublishDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(new Date(date))
    .replaceAll("/", ".");
}

export default async function Home() {
  const { about, latestNotes, now } = await getPublicHomeContent();

  return (
    <main className="flex flex-1 flex-col" id="main-content">
      <section
        className="border-b border-border bg-[radial-gradient(circle_at_calc(50%-min(26rem,32vw))_12%,rgba(184,93,22,0.045),transparent_30rem)]"
        aria-labelledby="landing-title"
      >
        <ContentContainer className="py-[clamp(3.75rem,7vw,6.75rem)] [@media(max-width:40rem)]:py-12">
          <div className="max-w-[47rem]">
            <h1
              className="m-0 text-[clamp(2.65rem,5.2vw,4.75rem)] leading-[1.02] font-[540] tracking-[-0.055em] text-balance [@media(max-width:40rem)]:text-[clamp(2.4rem,11.5vw,3.25rem)]"
              id="landing-title"
            >
              嗨，这里是 <span className="text-brand-ink" lang="en">CQ’s Lab</span>
            </h1>
            <p className="mt-9 mb-0 text-[clamp(1.35rem,2.2vw,1.75rem)] leading-snug font-[520] tracking-[-0.025em] text-foreground [@media(max-width:40rem)]:mt-7">
              记录学习、实践与思考。
            </p>
            <p className="mt-7 mb-0 max-w-[40rem] text-base leading-8 text-muted-foreground">
              这里主要整理软件开发与 AI 应用相关的学习笔记，也记录工作、生活中的一些经验和想法。
            </p>
            <p className="mt-4 mb-0 max-w-[40rem] text-base leading-8 text-muted-foreground">
              写给未来的自己，也分享给恰好需要的人。
            </p>
          </div>
        </ContentContainer>
      </section>

      <section className="border-b border-border" aria-labelledby="now-title">
        <ContentContainer className="grid grid-cols-[8rem_minmax(0,1fr)] gap-[clamp(2rem,6vw,6rem)] py-[clamp(2.75rem,5vw,4.5rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-5">
          <h2 className={sectionLabelClassName} id="now-title" lang="en">
            Now
          </h2>
          <div className="max-w-[43rem]">
            <div className="prose dark:prose-invert max-w-none prose-p:my-0 prose-p:text-[clamp(1.05rem,1.8vw,1.25rem)] prose-p:leading-8 prose-p:tracking-[-0.012em] prose-p:text-foreground prose-a:text-brand-ink prose-a:underline-offset-4 hover:prose-a:underline prose-strong:font-semibold [&>*+*]:mt-5">
              <MarkdownRenderer>{now.markdown}</MarkdownRenderer>
            </div>
            <p className="mt-5 mb-0 font-mono text-xs leading-body text-muted-foreground">
              更新于 <time dateTime={now.updatedDateTime}>{now.updatedLabel}</time>
            </p>
          </div>
        </ContentContainer>
      </section>

      <section className="border-b border-border" aria-labelledby="latest-note-title">
        <ContentContainer className="py-[clamp(3.25rem,6vw,5.5rem)]">
          <h2 className={sectionLabelClassName} id="latest-note-title" lang="en">
            {latestNotes.length > 1 ? "Latest Notes" : "Latest Note"}
          </h2>
          {latestNotes.length > 0 ? (
            <ol className="mt-9 max-w-[48rem]">
              {latestNotes.map((latestNote, index) => (
                <li
                  className={
                    index === 0 ? undefined : "mt-10 border-t border-border pt-10"
                  }
                  key={latestNote.id}
                >
                  <article>
                    <p className="m-0 font-mono text-xs leading-body text-muted-foreground">
                      <time dateTime={latestNote.publishedAt}>
                        {formatPublishDate(latestNote.publishedAt)}
                      </time>
                      {latestNote.categoryName ? (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{latestNote.categoryName}</span>
                        </>
                      ) : null}
                    </p>
                    <h3 className="mt-4 mb-0 max-w-[24ch] text-[clamp(1.75rem,3.6vw,3rem)] leading-[1.15] font-[540] tracking-[-0.04em] text-balance">
                      <Link
                        className="rounded-sm transition-colors duration-[140ms] hover:text-brand-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                        href={`/notes/${latestNote.id}`}
                      >
                        {latestNote.title}
                      </Link>
                    </h3>
                    {latestNote.summary ? (
                      <p className="mt-5 mb-0 line-clamp-3 max-w-[42rem] text-base leading-8 text-muted-foreground">
                        {latestNote.summary}
                      </p>
                    ) : null}
                    <Link
                      className="mt-7 inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-brand-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      href={`/notes/${latestNote.id}`}
                    >
                      阅读全文 <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-7 mb-0 text-sm leading-7 text-muted-foreground">
              还没有公开 Notes。第一篇记录发布后会出现在这里。
            </p>
          )}
        </ContentContainer>
      </section>

      <section id="about" aria-labelledby="about-title">
        <ContentContainer className="grid grid-cols-[8rem_minmax(0,1fr)] gap-[clamp(2rem,6vw,6rem)] py-[clamp(3.5rem,7vw,6.5rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-6">
          <h2 className={sectionLabelClassName} id="about-title" lang="en">
            About
          </h2>
          <div className="max-w-[43rem]">
            <div className="prose dark:prose-invert max-w-none prose-p:my-0 prose-p:text-base prose-p:leading-8 prose-p:text-muted-foreground prose-a:text-brand-ink prose-a:underline-offset-4 hover:prose-a:underline prose-strong:font-semibold [&>p:first-child]:text-[clamp(1.15rem,2vw,1.4rem)] [&>p:first-child]:leading-9 [&>p:first-child]:tracking-[-0.015em] [&>p:first-child]:text-foreground [&>p+p]:mt-4 [&>p:first-child+p]:mt-6">
              <MarkdownRenderer>{about.markdown}</MarkdownRenderer>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2">
              <a
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground underline-offset-4 transition-colors duration-[140ms] hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                href="mailto:chengqifw@gmail.com"
              >
                Email <span aria-hidden="true">↗</span>
              </a>
              <a
                className="inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground underline-offset-4 transition-colors duration-[140ms] hover:text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                href="https://github.com/bangbangde"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </ContentContainer>
      </section>
    </main>
  );
}
