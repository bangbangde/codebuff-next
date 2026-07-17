import Link from "next/link";
import { noteEntries } from "./content";

const selectedNotes = [
  {
    ...noteEntries[0],
    readTime: "8 min read",
    coverCaption: "Systems / Interface / Judgment",
  },
  {
    ...noteEntries[1],
    readTime: "6 min read",
    coverCaption: "Reversible / Compare / Learn",
  },
  {
    ...noteEntries[2],
    readTime: "5 min read",
    coverCaption: "Hierarchy / Space / Restraint",
  },
] as const;

const articleMetaClassName =
  "m-0 font-mono text-[0.72rem] leading-body tracking-[0.075em] text-accent uppercase";

const articleSummaryClassName =
  "mt-6 max-w-[38rem] text-[1.04rem] leading-[1.78] text-muted-foreground [@media(max-width:40rem)]:mt-4 [@media(max-width:40rem)]:text-[0.98rem] [@media(max-width:40rem)]:leading-[1.62]";

const articleCtaClassName =
  "mt-9 inline-flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--accent)_42%,transparent)] pb-[0.3rem] font-mono text-[0.78rem] leading-body text-accent [@media(max-width:40rem)]:mt-5";

const articleLinkClassName =
  "group no-underline transition-colors duration-150 ease-[ease] hover:text-accent focus-visible:text-accent motion-reduce:transition-none";

const closingLinkClassName =
  "group relative isolate grid min-h-60 content-between gap-12 p-[clamp(2rem,4vw,3.25rem)] no-underline transition-colors duration-150 ease-[ease] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:opacity-0 before:transition-opacity before:duration-150 before:ease-[ease] hover:text-accent hover:before:opacity-100 focus-visible:text-accent focus-visible:before:opacity-100 motion-reduce:transition-none before:motion-reduce:transition-none [@media(max-width:40rem)]:min-h-44 [@media(max-width:40rem)]:gap-8 [@media(max-width:40rem)]:px-0 [@media(max-width:40rem)]:py-7";

const closingLeftBackgroundClassName =
  "before:bg-[linear-gradient(to_right,transparent_0,var(--accent-soft)_var(--layout-gutter))] [@media(max-width:40rem)]:before:bg-[linear-gradient(to_right,transparent_0,var(--accent-soft)_var(--layout-gutter),var(--accent-soft)_calc(100%_-_var(--layout-gutter)),transparent_100%)]";

const closingRightBackgroundClassName =
  "before:bg-[linear-gradient(to_left,transparent_0,var(--accent-soft)_var(--layout-gutter))] [@media(max-width:40rem)]:before:bg-[linear-gradient(to_right,transparent_0,var(--accent-soft)_var(--layout-gutter),var(--accent-soft)_calc(100%_-_var(--layout-gutter)),transparent_100%)]";

function NoteCover({
  caption,
  index,
  lead = false,
}: {
  caption: string;
  index: number;
  lead?: boolean;
}) {
  const backgroundClassName = [
    "bg-[#f1e7d7] dark:bg-[#30271d]",
    "bg-[#f6d9bd] dark:bg-[#3a281c]",
    "bg-[#e9ece8] dark:bg-[#252a26]",
  ][index];

  return (
    <div
      className={`relative isolate overflow-hidden border border-border ${backgroundClassName} ${
        lead
          ? "aspect-[1.28] [@media(max-width:40rem)]:aspect-[1.75]"
          : "aspect-[1.65]"
      }`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-white/15 to-transparent dark:from-white/5 dark:via-transparent" />
      <p className="absolute top-[6%] left-[5%] z-[2] m-0 font-mono text-[0.6875rem] leading-body tracking-[0.08em] text-muted-foreground uppercase">
        {caption}
      </p>

      {index === 0 ? (
        <>
          <div className="absolute inset-[10%_9%] border border-foreground/20">
            <span className="absolute inset-y-0 left-[32%] w-px bg-foreground/10" />
            <span className="absolute inset-x-0 top-[68%] h-px bg-foreground/10" />
          </div>
          <div className="absolute top-1/2 left-1/2 aspect-square w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent">
            <span className="absolute inset-[15%] rounded-full border border-accent/50" />
            <span className="absolute inset-[31%] rounded-full border border-accent bg-accent" />
          </div>
          <span className="absolute top-[23%] right-[24%] size-4 rounded-full bg-foreground" />
          <span className="absolute right-[14%] bottom-[16%] size-[0.55rem] rounded-full bg-[#ea8a2e]" />
        </>
      ) : null}

      {index === 1 ? (
        <>
          <span className="absolute top-[31%] left-[16%] h-px w-[62%] origin-left rotate-[18deg] bg-foreground" />
          <span className="absolute top-[66%] left-[22%] h-px w-[52%] origin-left -rotate-[14deg] bg-foreground" />
          <span className="absolute top-[24%] left-[14%] size-3 rounded-full border-2 border-foreground bg-background" />
          <span className="absolute top-[44%] right-[18%] size-3 rounded-full border-2 border-accent bg-accent" />
          <span className="absolute right-[24%] bottom-[19%] size-3 rounded-full border-2 border-foreground bg-background" />
          <span className="absolute bottom-[25%] left-[20%] size-3 rounded-full border-2 border-foreground bg-foreground" />
        </>
      ) : null}

      {index === 2 ? (
        <>
          <div className="absolute inset-[13%_10%] border border-foreground/20 bg-background/50" />
          <span className="absolute top-[23%] left-[17%] h-[3px] w-[28%] bg-foreground" />
          <span className="absolute top-[31%] left-[17%] h-0.5 w-[17%] bg-muted-foreground" />
          <span className="absolute right-[17%] bottom-[22%] aspect-square w-[25%] rounded-full border border-accent" />
        </>
      ) : null}

      <p className="absolute right-[5%] bottom-[4%] m-0 font-mono text-[clamp(2.5rem,6vw,5.5rem)] leading-none font-medium tracking-[-0.08em] text-accent/50">
        {String(index + 1).padStart(2, "0")}
      </p>
    </div>
  );
}

export default function Home() {
  return (
    <main id="main-content">
      <section
        className="grid min-h-0 content-center bg-[linear-gradient(to_right,var(--background)_0,transparent_var(--layout-gutter),transparent_calc(100%_-_var(--layout-gutter)),var(--background)_100%),radial-gradient(circle_at_14%_9%,rgba(184,93,22,0.045),transparent_28rem)] pt-[clamp(3rem,4.5vw,4rem)] pb-[clamp(2.75rem,4vw,3.5rem)] [@media(max-width:40rem)]:pt-6 [@media(max-width:40rem)]:pb-4"
        aria-labelledby="landing-title"
      >
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
      </section>

      <section className="border-t border-border" aria-label="精选 Notes">
        <article>
          <Link
            className={`${articleLinkClassName} grid grid-cols-[minmax(0,1.25fr)_minmax(19rem,0.75fr)] items-center gap-[clamp(2.5rem,6vw,6rem)] py-[clamp(2.75rem,5vw,4rem)] [@media(max-width:52rem)]:grid-cols-1 [@media(max-width:52rem)]:gap-10 [@media(max-width:40rem)]:gap-6 [@media(max-width:40rem)]:pt-6 [@media(max-width:40rem)]:pb-11`}
            href={`/notes#${selectedNotes[0].slug}`}
          >
            <NoteCover
              caption={selectedNotes[0].coverCaption}
              index={0}
              lead
            />
            <div className="max-w-[29rem] [@media(max-width:52rem)]:max-w-[38rem]">
              <p className={articleMetaClassName}>
                {selectedNotes[0].kind} ·{" "}
                <span lang="en">{selectedNotes[0].readTime}</span>
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
                href={`/notes#${entry.slug}`}
              >
                <div className="max-w-[38rem]">
                  <p className={articleMetaClassName}>
                    {entry.kind} · <span lang="en">{entry.readTime}</span>
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
                  <NoteCover caption={entry.coverCaption} index={index} />
                </div>
              </Link>
            </article>
          );
        })}
      </section>

      <section
        className="border-t border-border bg-surface-muted py-[clamp(4.5rem,9vw,7.5rem)_clamp(3rem,6vw,5rem)] [box-shadow:0_0_0_100vmax_var(--surface-muted)] [clip-path:inset(0_-100vmax)] [@media(max-width:40rem)]:py-[4rem_2.75rem]"
        aria-labelledby="closing-title"
      >
        <h2
          className="m-0 text-[clamp(2.4rem,5vw,4.75rem)] leading-[1.05] font-[540] tracking-[-0.052em] [@media(max-width:40rem)]:text-[clamp(2.5rem,12vw,3.4rem)]"
          id="closing-title"
        >
          先看到这里
        </h2>
        <nav
          className="mt-[clamp(2.75rem,6vw,4.5rem)] grid grid-cols-2 border-y border-border [@media(max-width:40rem)]:mt-10 [@media(max-width:40rem)]:grid-cols-1"
          aria-label="继续探索"
        >
          <Link
            className={`${closingLinkClassName} ${closingLeftBackgroundClassName}`}
            href="/notes"
          >
            <span>
              <span className="block font-mono text-[0.72rem] leading-body tracking-[0.075em] text-accent">
                01
              </span>
              <span className="mt-[0.85rem] block text-[clamp(2.25rem,4vw,3.65rem)] leading-none font-[560] tracking-[-0.047em] [@media(max-width:40rem)]:text-[2.4rem]">
                Notes
              </span>
            </span>
            <span className="flex items-end justify-between gap-8">
              <span className="text-base leading-[1.6] text-muted-foreground">
                更多文章、札记与实验
              </span>
              <span className="shrink-0 font-mono text-[1.35rem] leading-none text-accent transition-transform duration-150 ease-[ease] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
          <Link
            className={`${closingLinkClassName} ${closingRightBackgroundClassName} border-l border-border [@media(max-width:40rem)]:border-t [@media(max-width:40rem)]:border-l-0`}
            href="/me"
          >
            <span>
              <span className="block font-mono text-[0.72rem] leading-body tracking-[0.075em] text-accent">
                02
              </span>
              <span className="mt-[0.85rem] block text-[clamp(2.25rem,4vw,3.65rem)] leading-none font-[560] tracking-[-0.047em] [@media(max-width:40rem)]:text-[2.4rem]">
                Me
              </span>
            </span>
            <span className="flex items-end justify-between gap-8">
              <span className="text-base leading-[1.6] text-muted-foreground">
                关于 CQ 和正在做的事
              </span>
              <span className="shrink-0 font-mono text-[1.35rem] leading-none text-accent transition-transform duration-150 ease-[ease] group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                →
              </span>
            </span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
