import Image from "next/image";
import Link from "next/link";
import { SiteUtilityLinks } from "./site-utility-links";

const navigationLinkClassName =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 font-mono text-sm leading-body text-muted-foreground no-underline transition-[color,background-color,border-color] duration-[140ms] ease-[ease] hover:bg-brand-accent-soft hover:text-brand-accent focus-visible:bg-brand-accent-soft focus-visible:text-brand-accent motion-reduce:transition-none";

export function SiteHeader() {
  return (
    <>
      <a
        className="fixed top-3 left-(--layout-gutter) z-100 -translate-y-[calc(100%+1.5rem)] border border-foreground bg-background px-3 py-2 font-mono text-sm leading-body text-foreground no-underline transition-[transform] duration-140 ease-[ease] focus-visible:translate-y-0 motion-reduce:transition-none"
        href="#main-content"
      >
        跳到主要内容
      </a>
      <header
        className="sticky top-0 z-10 border-b border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-[14px]"
      >
        <div className="mx-auto flex min-h-18 w-full max-w-[calc(var(--layout-max)+2*var(--layout-gutter))] items-center justify-between gap-6 px-(--layout-gutter)">
          <Link
            className="inline-flex min-h-11 items-center gap-2 font-sans text-[1.0625rem] leading-none font-semibold tracking-[-0.035em] text-foreground no-underline transition-colors duration-[140ms] ease-[ease] hover:text-brand-accent focus-visible:text-brand-accent motion-reduce:transition-none"
            href="/"
            aria-label="CQ’s Lab 首页"
          >
            <Image
              className="block size-9 shrink-0"
              src="/brand/mark.svg"
              alt=""
              width={36}
              height={36}
              unoptimized
              aria-hidden="true"
            />
            <span lang="en">CQ’s Lab</span>
          </Link>
          <nav
            className="flex items-center gap-1"
            aria-label="主导航"
          >
            <Link className={navigationLinkClassName} href="/notes" lang="en">
              Notes
            </Link>
            <Link className={navigationLinkClassName} href="/me" lang="en">
              About
            </Link>
            <SiteUtilityLinks />
          </nav>
        </div>
      </header>
    </>
  );
}
