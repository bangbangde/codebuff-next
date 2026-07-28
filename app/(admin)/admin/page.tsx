import Link from "next/link";

import { requireCurrentSession } from "@/lib/auth/session";
import { FoundationActions } from "./_components/foundation-actions";

export default async function AdminPage() {
  const session = await requireCurrentSession();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[80rem] flex-col px-5 py-4 sm:px-8 sm:py-6">
      <header className="flex min-h-12 items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex min-w-0 items-baseline gap-3">
          <Link
            className="shrink-0 text-sm font-semibold tracking-[-0.02em] hover:text-brand-accent focus-visible:text-brand-accent"
            href="/"
          >
            CQ’s Lab
          </Link>
          <span className="truncate font-mono text-xs tracking-[0.08em] text-muted-foreground uppercase">
            Admin
          </span>
        </div>
        <nav
          aria-label="Admin shortcuts"
          className="flex shrink-0 items-center gap-1"
        >
          <Link
            className="inline-flex min-h-9 items-center rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
            href="/account"
          >
            Account
          </Link>
          <Link
            className="inline-flex min-h-9 items-center rounded-md px-3 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
            href="/"
          >
            View site
          </Link>
        </nav>
      </header>

      <div className="grid flex-1 content-start gap-8 py-[clamp(3rem,8vw,7rem)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <section aria-labelledby="admin-title" className="max-w-2xl">
          <p className="mb-4 font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
            Authenticated entry
          </p>
          <h1
            className="max-w-[14ch] text-[clamp(2.5rem,7vw,5.5rem)] leading-[0.94] font-semibold tracking-[-0.06em] text-balance"
            id="admin-title"
          >
            管理界面基础已就绪
          </h1>
          <p className="mt-7 max-w-[38rem] text-[1.0625rem] leading-7 text-muted-foreground">
            这里目前只提供受保护的管理入口和共享界面基础验证。内容管理、编辑与发布流程尚未接入。
          </p>
          <div className="mt-9">
            <FoundationActions />
          </div>
        </section>

        <aside
          aria-labelledby="session-title"
          className="self-start rounded-lg border border-border bg-card p-5 text-card-foreground shadow-[0_1px_0_rgb(0_0_0/0.04)]"
        >
          <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground uppercase">
            Current state
          </p>
          <h2 className="mt-4 text-base font-semibold" id="session-title">
            Session active
          </h2>
          <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">
            {session.user.email}
          </p>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-brand-accent shadow-[0_0_0_3px_var(--brand-accent-soft)]"
              />
              <span>认证边界正常</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
