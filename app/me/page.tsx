import type { Metadata } from "next";
import { FactList } from "../fact-list";
import { SectionLabel } from "../section-label";

const facts = [
  {
    term: "Focus",
    description: "Frontend systems · Architecture · AI collaboration",
  },
  {
    term: "Now",
    description: "寻找更清晰、更可靠的软件构建方式",
    descriptionLang: "zh-CN",
  },
] as const;

const principles = [
  {
    label: "Understand",
    description: "从产品目标与使用情境出发，先把真正的问题说清楚",
  },
  {
    label: "Design",
    description: "在体验、技术与长期维护成本之间做有意识的取舍",
  },
  {
    label: "Deliver",
    description: "让方案可以验证、可靠交付，也能在反馈中持续演进",
  },
] as const;

export const metadata: Metadata = {
  title: "Me",
  description: "A concise introduction to CQ and the work behind CQ’s Lab.",
};

export default function MePage() {
  return (
    <main
      className="min-h-[70svh] pt-[clamp(3rem,7vw,6rem)]"
      id="main-content"
    >
      <section
        className="border-b [border-bottom-color:var(--border)] pb-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="me-page-title"
      >
        <SectionLabel>Me / Frontend engineer</SectionLabel>
        <div className="mt-6 grid grid-cols-[minmax(0,0.9fr)_minmax(24rem,1fr)] [align-items:start] gap-[clamp(3rem,8vw,8rem)] [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-8">
          <h1
            className="m-0 max-w-[12ch] text-display font-[520] leading-display tracking-[-0.05em]"
            id="me-page-title"
            lang="en"
          >
            Building beyond the interface.
          </h1>
          <div className="pt-2 [@media(max-width:40rem)]:pt-0">
            <p
              className="m-0 max-w-[38rem] text-lg leading-body text-muted-foreground"
              lang="zh-CN"
            >
              我是一名前端工程师，关注产品理解、系统设计与工程判断，也在持续实践 AI-native 的软件协作方式
            </p>
            <div lang="en">
              <FactList
                className="mt-12"
                facts={facts}
                rowClassName="grid-cols-[8rem_1fr] gap-6 [@media(max-width:40rem)]:grid-cols-[5rem_minmax(0,1fr)] [@media(max-width:40rem)]:gap-4"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-b [border-bottom-color:var(--border)] py-[clamp(4rem,8vw,7rem)]"
        aria-labelledby="practice-title"
      >
        <div className="grid grid-cols-[minmax(12rem,0.3fr)_minmax(0,1fr)] [align-items:start] gap-6 [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-4">
          <SectionLabel>Practice / Approach</SectionLabel>
          <h2
            className="m-0 max-w-[16ch] text-[clamp(2rem,4vw,3.5rem)] font-[520] leading-[1.08] tracking-[-0.04em]"
            id="practice-title"
            lang="en"
          >
            How I approach the work
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-3 gap-[clamp(1.5rem,4vw,3rem)] [@media(max-width:40rem)]:mt-12 [@media(max-width:40rem)]:grid-cols-1 [@media(max-width:40rem)]:gap-8">
          {principles.map((principle, index) => (
            <article
              className="border-t [border-top-color:var(--border)] pt-6"
              key={principle.label}
            >
              <p className="m-0 font-mono text-xs leading-body tracking-label text-accent">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3
                className="mt-6 text-[clamp(1.25rem,2.2vw,1.75rem)] font-[540] tracking-[-0.025em]"
                lang="en"
              >
                {principle.label}
              </h3>
              <p className="mt-4 text-muted-foreground" lang="zh-CN">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
