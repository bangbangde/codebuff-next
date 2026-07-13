import Link from "next/link";
import { BrandMark } from "./brand-mark";

const navigationLinkClassName =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 font-mono text-sm leading-body text-muted-foreground no-underline transition-[color,background-color,border-color] duration-[140ms] ease-[ease] hover:bg-accent-soft hover:text-accent focus-visible:bg-accent-soft focus-visible:text-accent motion-reduce:transition-none";

export function SiteHeader() {
  return (
    <>
      <a
        className="fixed top-3 left-[var(--layout-gutter)] z-[100] border border-foreground bg-background px-3 py-2 font-mono text-sm leading-body text-foreground no-underline transition-[transform] duration-[140ms] ease-[ease] [transform:translateY(calc(-100%_-_1.5rem))] focus-visible:[transform:translateY(0)] motion-reduce:transition-none"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-10 border-b border-border bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-[14px]">
        <div className="mx-auto flex min-h-18 w-full max-w-[calc(var(--layout-max)_+_2*var(--layout-gutter))] items-center justify-between gap-6 px-[var(--layout-gutter)]">
          <Link
            className="group inline-flex min-h-11 items-center no-underline"
            href="/"
            aria-label="Codebuff home"
          >
            <BrandMark className="transition-[color,background-color,border-color] duration-[140ms] ease-[ease] group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none" />
          </Link>
          <nav className="flex gap-1" aria-label="Primary navigation">
            <Link className={navigationLinkClassName} href="/lab">
              Lab
            </Link>
            <Link className={navigationLinkClassName} href="/me">
              Me
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
