import type { Metadata } from "next";

import { ContentContainer } from "../_components/content-container";
import { SectionLabel } from "../_components/section-label";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the private account area of CQ's Lab.",
};

export default function SignInPage() {
  return (
    <main
      className="min-h-[70svh] pt-[clamp(3rem,7vw,6rem)] pb-[clamp(4rem,8vw,7rem)]"
      id="main-content"
    >
      <ContentContainer>
        <section
          className="grid grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] items-start gap-[clamp(3rem,10vw,9rem)] border-b border-border pb-[clamp(4rem,8vw,7rem)] [@media(max-width:46rem)]:grid-cols-1 [@media(max-width:46rem)]:gap-10"
          aria-labelledby="sign-in-title"
        >
          <div>
            <SectionLabel>Private / Account</SectionLabel>
            <h1
              className="mt-6 mb-0 max-w-[10ch] text-display font-[520] leading-display tracking-[-0.05em]"
              id="sign-in-title"
              lang="en"
            >
              Sign in to continue.
            </h1>
            <p className="mt-7 max-w-[34rem] text-lg leading-body text-muted-foreground">
              这里是 CQ&apos;s Lab 的私人账户入口。当前不开放注册，账户由站点所有者创建。
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted p-[clamp(1.5rem,4vw,2.5rem)]">
            <h2
              className="m-0 text-[1.5rem] font-[540] tracking-[-0.035em]"
              lang="en"
            >
              Account access
            </h2>
            <p className="mt-3 text-sm leading-body text-muted-foreground">
              使用邮箱和密码登录。
            </p>
            <SignInForm />
          </div>
        </section>
      </ContentContainer>
    </main>
  );
}
