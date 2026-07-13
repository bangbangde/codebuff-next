import type { Metadata } from "next";
import { labEntries } from "../content";
import { SectionLabel } from "../section-label";

export const metadata: Metadata = {
  title: "Lab · Codebuff",
  description: "Engineering notes and frontend experiments.",
};

export default function LabPage() {
  return (
    <main
      className="min-h-[70svh] pt-[clamp(3rem,7vw,6rem)]"
      id="main-content"
    >
      <section
        className="border-b [border-bottom-color:var(--border)] pb-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="lab-page-title"
      >
        <SectionLabel>Lab / Selected work</SectionLabel>
        <h1
          className="mt-4 max-w-[12ch] text-display font-[520] leading-display tracking-[-0.05em]"
          id="lab-page-title"
        >
          Notes from the workbench.
        </h1>
        <p
          className="mt-6 max-w-[38rem] text-lg leading-body text-muted-foreground"
          lang="zh-CN"
        >
          这里收集工程笔记、界面研究与仍在形成中的技术实验
        </p>
      </section>
      <section aria-label="Selected Lab entries">
        {labEntries.map((entry, index) => (
          <article
            className="grid scroll-mt-8 grid-cols-[minmax(8rem,0.3fr)_1fr] gap-6 border-b [border-bottom-color:var(--border)] py-[clamp(2rem,4vw,3rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-3"
            id={entry.slug}
            key={entry.slug}
          >
            <p className="m-0 font-mono text-xs leading-body tracking-label text-muted-foreground uppercase">
              {String(index + 1).padStart(2, "0")} / {entry.kind}
            </p>
            <div>
              <h2 className="m-0 text-[clamp(1.25rem,3vw,2rem)] font-[540] tracking-[-0.03em]">
                {entry.title}
              </h2>
              <p className="mt-4 max-w-[40rem] text-muted-foreground" lang="zh-CN">
                {entry.summary}
              </p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
