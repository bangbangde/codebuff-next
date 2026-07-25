import type { Metadata } from "next";

import { requireCurrentSession } from "@/lib/auth/session";
import { ContentContainer } from "../_components/content-container";
import { SectionLabel } from "../_components/section-label";
import { SignOutButton } from "./sign-out-button";
import { TotpSection } from "./totp-section";

export const metadata: Metadata = {
  title: "Account",
  description: "Private account details for CQ's Lab.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ recovery?: string }>;
}) {
  const { user } = await requireCurrentSession();
  const params = await searchParams;
  const showRecoveryNotice = params?.recovery === "1";

  return (
    <main
      className="min-h-[70svh] pt-[clamp(3rem,7vw,6rem)] pb-[clamp(4rem,8vw,7rem)]"
      id="main-content"
    >
      <ContentContainer>
        {showRecoveryNotice && user.twoFactorEnabled && (
          <div
            className="mb-10 rounded-lg border border-accent/30 bg-accent/10 p-[clamp(1.25rem,3vw,2rem)]"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-background">
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    clipRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM11 13a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-1-8a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V6a1 1 0 0 0-1-1z"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="m-0 font-medium text-foreground"
                  lang="en"
                >
                  You signed in with a recovery code
                </p>
                <p className="m-0 mt-1 text-sm leading-body text-muted-foreground">
                  你刚刚使用了恢复码登录。如果你丢失了身份验证器设备，建议尽快重新设置 TOTP
                  或生成一组新的恢复码，以确保账户安全。
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-foreground px-4 py-2 font-mono text-sm font-medium text-background transition-[background-color,color,opacity] duration-150 ease-[ease] hover:bg-accent focus-visible:bg-accent focus-visible:outline-none motion-reduce:transition-none"
                    href="#security-title"
                  >
                    管理两步验证
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <section
          className="border-b border-border pb-[clamp(4rem,8vw,7rem)]"
          aria-labelledby="account-title"
        >
          <SectionLabel>Private / Account</SectionLabel>
          <div className="mt-6 grid grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] items-start gap-[clamp(3rem,8vw,8rem)] [@media(max-width:46rem)]:grid-cols-1 [@media(max-width:46rem)]:gap-10">
            <div>
              <h1
                className="m-0 max-w-[10ch] text-display font-[520] leading-display tracking-[-0.05em]"
                id="account-title"
                lang="en"
              >
                Account
              </h1>
              <p className="mt-7 max-w-[32rem] text-lg leading-body text-muted-foreground">
                当前访问已通过数据库 Session 验证。
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface-muted p-[clamp(1.5rem,4vw,2.5rem)]">
              <dl className="m-0">
                <div className="border-b border-border pb-6">
                  <dt
                    className="font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
                    lang="en"
                  >
                    Name
                  </dt>
                  <dd className="mt-2 ml-0 text-lg font-medium">{user.name}</dd>
                </div>
                <div className="pt-6">
                  <dt
                    className="font-mono text-xs leading-body tracking-label text-muted-foreground uppercase"
                    lang="en"
                  >
                    Email
                  </dt>
                  <dd className="mt-2 ml-0 break-all text-lg">{user.email}</dd>
                </div>
              </dl>

              <div className="mt-10 border-t border-border pt-8">
                <SignOutButton />
              </div>
            </div>
          </div>
        </section>

        <section
          className="pt-[clamp(4rem,8vw,7rem)]"
          aria-labelledby="security-title"
        >
          <SectionLabel>Private / Security</SectionLabel>
          <div className="mt-6 grid grid-cols-[minmax(0,0.9fr)_minmax(20rem,1fr)] items-start gap-[clamp(3rem,8vw,8rem)] [@media(max-width:46rem)]:grid-cols-1 [@media(max-width:46rem)]:gap-10">
            <div>
              <h2
                className="m-0 max-w-[16ch] text-[1.75rem] font-[520] leading-tight tracking-[-0.035em]"
                id="security-title"
              >
                两步验证
              </h2>
              <p className="mt-5 max-w-[32rem] text-lg leading-body text-muted-foreground">
                使用 TOTP 认证应用为账户增加一层额外的登录保护。
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface-muted p-[clamp(1.5rem,4vw,2.5rem)]">
              <h3
                className="m-0 text-[1.5rem] font-[540] tracking-[-0.035em]"
                lang="en"
              >
                {user.twoFactorEnabled ? "TOTP enabled" : "TOTP not enabled"}
              </h3>
              <TotpSection enabled={Boolean(user.twoFactorEnabled)} />
            </div>
          </div>
        </section>
      </ContentContainer>
    </main>
  );
}
