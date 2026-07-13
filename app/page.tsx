import Link from "next/link";
import { labEntries } from "./content";

const editorialLabelBaseClassName =
  "m-0 font-mono leading-body tracking-label uppercase";

const editorialLabelClassName = `${editorialLabelBaseClassName} text-xs`;

const mutedEditorialLabelClassName =
  `${editorialLabelClassName} text-muted-foreground`;

const sectionIndexClassName =
  `${editorialLabelBaseClassName} text-[0.8125rem] font-semibold text-muted-foreground`;

const sectionClassName =
  "border-b border-border py-[clamp(4rem,8vw,7rem)]";

const sectionHeadingClassName =
  "flex items-end justify-between gap-8 [@media(max-width:40rem)]:items-start [@media(max-width:40rem)]:gap-4";

const sectionTitleClassName =
  "mt-3 text-[clamp(1.75rem,4vw,3.25rem)] font-[520] leading-[1.1] tracking-[-0.035em]";

const sectionLinkClassName =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 font-mono text-sm leading-body text-muted-foreground no-underline transition-[color,background-color] duration-[140ms] ease-[ease] hover:bg-accent-soft hover:text-accent focus-visible:bg-accent-soft focus-visible:text-accent motion-reduce:transition-none [@media(max-width:40rem)]:-mt-2 [@media(max-width:40rem)]:-mr-3";

const entryClassName =
  "group grid grid-cols-[minmax(8rem,0.32fr)_minmax(0,1fr)_auto] items-center gap-6 border-b border-border py-6 no-underline transition-[padding,color,background-color] duration-[160ms] ease-[ease] hover:bg-surface-muted hover:px-3 hover:text-accent focus-visible:bg-surface-muted focus-visible:px-3 focus-visible:text-accent motion-reduce:transition-none [@media(max-width:40rem)]:grid-cols-[1fr_auto] [@media(max-width:40rem)]:gap-x-4 [@media(max-width:40rem)]:gap-y-2";

export default function Home() {
  return (
    <main id="main-content">
      <section
        className="grid min-h-[min(58svh,40rem)] content-center border-b border-border py-[clamp(4.5rem,9vw,8rem)] [@media(max-width:40rem)]:min-h-0 [@media(max-width:40rem)]:py-[clamp(5rem,22vw,7rem)]"
        aria-labelledby="landing-title"
      >
        <p className={`${editorialLabelClassName} text-accent`}>
          Frontend engineering · AI era
        </p>
        <h1
          className="mt-6 max-w-[13ch] text-[clamp(3rem,9vw,7.75rem)] font-[520] leading-[0.96] tracking-[-0.065em] text-balance lg:max-w-none lg:text-[clamp(4.5rem,6.2vw,6.75rem)] lg:whitespace-nowrap [@media(max-width:40rem)]:text-[clamp(3rem,13.5vw,4.5rem)] [@media(max-width:40rem)]:leading-[0.98] [@media(max-width:40rem)]:tracking-[-0.055em]"
          id="landing-title"
        >
          Beyond the frontend.
        </h1>
        <p
          className="mt-8 max-w-[var(--layout-reading)] text-lg leading-body text-muted-foreground"
          lang="zh-CN"
        >
          从前端出发，关注产品如何被理解、系统如何被设计，以及 AI
          正在如何改变软件开发
        </p>
      </section>

      <div className="grid">
        <section className={sectionClassName} aria-labelledby="lab-title">
          <div className={sectionHeadingClassName}>
            <div>
              <p className={sectionIndexClassName}>
                01 / Lab
              </p>
              <h2 className={sectionTitleClassName} id="lab-title">
                Notes & experiments
              </h2>
            </div>
            <Link href="/lab" className={sectionLinkClassName}>
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="mt-12 border-t border-border">
            {labEntries.map((entry) => (
              <Link
                href={`/lab#${entry.slug}`}
                className={entryClassName}
                key={entry.slug}
              >
                <span
                  className={`${mutedEditorialLabelClassName} [@media(max-width:40rem)]:col-span-full`}
                >
                  {entry.kind}
                </span>
                <span className="text-[clamp(1.05rem,2.2vw,1.4rem)] font-[540] leading-body">
                  {entry.title}
                </span>
                <span
                  className="text-lg leading-body transition-[transform] duration-[160ms] ease-[ease] group-hover:[transform:translateX(var(--spacing))] group-focus-visible:[transform:translateX(var(--spacing))] motion-reduce:transition-none"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={sectionClassName} aria-labelledby="me-title">
          <div className={sectionHeadingClassName}>
            <div>
              <p className={sectionIndexClassName}>
                02 / Me
              </p>
              <h2 className={sectionTitleClassName} id="me-title">
                The engineer behind the work
              </h2>
            </div>
            <Link href="/me" className={sectionLinkClassName}>
              About <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] items-start gap-[clamp(2rem,6vw,6rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-8">
            <p
              className="m-0 max-w-xl text-lg leading-body text-muted-foreground"
              lang="zh-CN"
            >
              一名前端工程师，在 AI 时代探索前端之外的可能
            </p>
            <dl className="m-0 grid border-t border-border">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b border-border py-4">
                <dt className={mutedEditorialLabelClassName}>Focus</dt>
                <dd>Frontend systems · Architecture · AI collaboration</dd>
              </div>
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 border-b border-border py-4">
                <dt className={mutedEditorialLabelClassName}>Now</dt>
                <dd lang="zh-CN">寻找更清晰、更可靠的软件构建方式</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section
        className="grid min-h-[clamp(22rem,45svh,32rem)] place-content-center justify-items-center border-b border-border py-16 text-center [@media(max-width:40rem)]:min-h-[22rem]"
        aria-labelledby="end-title"
      >
        <div
          className="relative mb-8 h-4 w-20 before:absolute before:top-1/2 before:left-0 before:h-px before:w-7 before:bg-border before:content-[''] after:absolute after:top-1/2 after:right-0 after:h-px after:w-7 after:bg-border after:content-['']"
          aria-hidden="true"
        >
          <span className="absolute top-1/2 left-1/2 size-2 rounded-full bg-accent [transform:translate(-50%,-50%)]" />
        </div>
        <p className={mutedEditorialLabelClassName}>End / for now</p>
        <h2
          className="mt-4 text-[clamp(2.25rem,4.5vw,4rem)] font-[520] leading-[1.05] tracking-[-0.045em]"
          id="end-title"
        >
          先到这里
        </h2>
        <p className="mt-6 text-base leading-body text-muted-foreground" lang="zh-CN">
          探索还在继续，下次更新见
        </p>
      </section>
    </main>
  );
}
