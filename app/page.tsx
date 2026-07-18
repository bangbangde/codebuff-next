import Link from "next/link";
import { getAllNotes } from "@/lib/content/notes";
import { ContentContainer } from "./_components/content-container";
import { ClosingLink } from "./_landing/closing-link";
import { NoteCover } from "./_landing/note-cover";

const articleMetaClassName =
  "m-0 font-mono text-[0.72rem] leading-body tracking-[0.075em] text-accent uppercase";

const articleSummaryClassName =
  "mt-6 max-w-[38rem] text-[1.04rem] leading-[1.78] text-muted-foreground [@media(max-width:40rem)]:mt-4 [@media(max-width:40rem)]:text-[0.98rem] [@media(max-width:40rem)]:leading-[1.62]";

const articleCtaClassName =
  "mt-9 inline-flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--accent)_42%,transparent)] pb-[0.3rem] font-mono text-[0.78rem] leading-body text-accent [@media(max-width:40rem)]:mt-5";

const articleLinkClassName =
  "group no-underline transition-colors duration-150 ease-[ease] hover:text-accent focus-visible:text-accent motion-reduce:transition-none";

export default async function Home() {
  const selectedNotes = (await getAllNotes()).slice(0, 3);

  return (
    <main id="main-content">
      <section
        className="bg-[radial-gradient(circle_at_calc(50%_-_min(26rem,32vw))_9%,rgba(184,93,22,0.045),transparent_28rem)]"
        aria-labelledby="landing-title"
      >
        <ContentContainer className="grid min-h-0 content-center pt-[clamp(3rem,4.5vw,4rem)] pb-[clamp(2.75rem,4vw,3.5rem)] [@media(max-width:40rem)]:pt-6 [@media(max-width:40rem)]:pb-4">
          <h1
            className="m-0 max-w-none text-[clamp(2.9rem,4.5vw,4.5rem)] leading-[0.98] font-[540] tracking-[-0.057em] text-balance [@media(max-width:40rem)]:max-w-[12ch] [@media(max-width:40rem)]:text-[clamp(2.65rem,11.8vw,3.35rem)] [@media(max-width:40rem)]:tracking-[-0.052em]"
            id="landing-title"
          >
            <span className="inline-block">嗨，这里是</span>{" "}
            <span
              className="ml-[0.16em] inline-block text-accent [@media(max-width:40rem)]:ml-[0.12em]"
              lang="en"
            >
              CQ’s Lab
            </span>
          </h1>
          <p
            className="mt-[0.65rem] mb-0 text-[0.94rem] leading-normal tracking-[0.012em] text-muted-foreground [@media(max-width:40rem)]:mt-[0.55rem] [@media(max-width:40rem)]:text-[0.82rem]"
            lang="en"
          >
            Thinking. Building. Learning.
          </p>
          <p
            className="mt-3 mb-0 flex items-center gap-3 font-mono text-[0.8125rem] leading-body tracking-[0.015em] text-muted-foreground [@media(max-width:40rem)]:mt-[0.6rem] [@media(max-width:40rem)]:text-xs"
            lang="en"
          >
            <span
              className="size-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_0.34rem_var(--accent-soft)]"
              aria-hidden="true"
            />
            Now — Getting the site ready.
          </p>
        </ContentContainer>
      </section>

      <ContentContainer>
        <section className="border-t border-border" aria-label="精选 Notes">
          <article>
            <Link
              className={`${articleLinkClassName} grid grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)] items-center gap-[clamp(2.5rem,6vw,6rem)] py-[clamp(2.75rem,5vw,4rem)] [@media(max-width:52rem)]:grid-cols-1 [@media(max-width:52rem)]:gap-10 [@media(max-width:40rem)]:gap-6 [@media(max-width:40rem)]:pt-6 [@media(max-width:40rem)]:pb-11`}
              href={`/notes/${selectedNotes[0].slug}`}
            >
              <NoteCover
                caption={selectedNotes[0].kind}
                index={0}
                lead
              />
              <div className="max-w-[29rem] [@media(max-width:52rem)]:max-w-[38rem]">
                <p className={articleMetaClassName}>
                  {selectedNotes[0].kind} ·{" "}
                  <span lang="en">
                    {selectedNotes[0].readingMinutes} min read
                  </span>
                </p>
                <h2 className="mt-5 mb-0 text-[clamp(2rem,4.2vw,3.7rem)] leading-[1.08] font-[560] tracking-[-0.047em] text-balance transition-colors duration-150 ease-[ease] group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none [@media(max-width:40rem)]:text-[clamp(2rem,9vw,2.55rem)]">
                  {selectedNotes[0].title}
                </h2>
                <p className={articleSummaryClassName}>
                  {selectedNotes[0].summary}
                </p>
                <span className={articleCtaClassName} lang="en">
                  Read note
                  <span className="transition-transform duration-150 ease-[ease] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                    →
                  </span>
                </span>
              </div>
            </Link>
          </article>

          {selectedNotes.slice(1).map((entry, offset) => {
            const index = offset + 1;

            return (
              <article className="border-t border-border" key={entry.slug}>
                <Link
                  className={`${articleLinkClassName} grid grid-cols-[minmax(0,1fr)_minmax(17rem,25rem)] items-center gap-[clamp(2rem,7vw,7rem)] py-[clamp(3.5rem,7vw,6rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-8 [@media(max-width:40rem)]:py-[3.25rem_4rem]`}
                  href={`/notes/${entry.slug}`}
                >
                  <div className="max-w-[38rem]">
                    <p className={articleMetaClassName}>
                      {entry.kind} ·{" "}
                      <span lang="en">{entry.readingMinutes} min read</span>
                    </p>
                    <h2 className="mt-5 mb-0 max-w-[18ch] text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.08] font-[560] tracking-[-0.047em] text-balance transition-colors duration-150 ease-[ease] group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none [@media(max-width:40rem)]:text-[clamp(1.85rem,8vw,2.35rem)]">
                      {entry.title}
                    </h2>
                    <p className={articleSummaryClassName}>{entry.summary}</p>
                    <span className={articleCtaClassName} lang="en">
                      Read note
                      <span className="transition-transform duration-150 ease-[ease] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </div>
                  <div className="[@media(max-width:40rem)]:order-first">
                    <NoteCover caption={entry.kind} index={index} />
                  </div>
                </Link>
              </article>
            );
          })}
        </section>
      </ContentContainer>

      <section
        className="bg-surface-muted pb-[clamp(3rem,6vw,5rem)] [@media(max-width:40rem)]:pb-[2.75rem]"
        aria-labelledby="closing-title"
      >
        <ContentContainer>
          <div className="border-t border-border pt-[clamp(4.5rem,9vw,7.5rem)] [@media(max-width:40rem)]:pt-16">
            <h2
              className="m-0 text-[clamp(2.4rem,5vw,4.75rem)] leading-[1.05] font-[540] tracking-[-0.052em] [@media(max-width:40rem)]:text-[clamp(2.5rem,12vw,3.4rem)]"
              id="closing-title"
            >
              先看到这里
            </h2>
          </div>
        </ContentContainer>
        <nav
          className="mt-[clamp(2.75rem,6vw,4.5rem)] grid grid-cols-2 border-y border-border [@media(max-width:52rem)]:grid-cols-1 [@media(max-width:40rem)]:mt-10"
          aria-label="继续探索"
        >
          <ClosingLink
            description="更多文章、札记与实验"
            href="/notes"
            index="01"
            side="left"
            title="Notes"
          />
          <ClosingLink
            description="关于 CQ 和正在做的事"
            href="/me"
            index="02"
            side="right"
            title="Me"
          />
        </nav>
      </section>
    </main>
  );
}
