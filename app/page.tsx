import { ContentContainer } from "./_components/content-container";

export default function Home() {
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
              className="ml-[0.16em] inline-block text-accent [@media(max-width:40rem)]:ml-[0.12em]"
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
            lang="en"
          >
            <span className="relative flex size-2 shrink-0" aria-hidden="true">
              <span className="absolute -inset-1 animate-ping rounded-full border border-accent opacity-70 [animation-duration:1.8s] [animation-timing-function:cubic-bezier(0,0,0.2,1)] motion-reduce:animate-none motion-reduce:opacity-0" />
              <span className="relative size-2 rounded-full bg-accent shadow-[0_0_0_0.25rem_var(--accent-soft)]" />
            </span>
            Now — Getting the site ready.
          </p>
        </ContentContainer>
      </section>

      <ContentContainer className="flex-1 flex justify-center items-center">
        <section aria-labelledby="articles-title">
          <h2
            className="text-2xl font-bold tracking-tight text-balance"
            id="articles-title"
          >
            Coming Soon...
          </h2>
        </section>
      </ContentContainer>
    </main>
  );
}
