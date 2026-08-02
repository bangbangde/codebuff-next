"use client";

import { ExternalLinkIcon, FileTextIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  adminNavigationItems,
  isAdminNavigationItemActive,
} from "./admin-navigation";

const navigationIcons = {
  account: UserRoundIcon,
  notes: FileTextIcon,
} as const;

type AdminIdentity = {
  email: string;
  name: string;
};

export function AdminShell({
  children,
  identity,
}: Readonly<{
  children: React.ReactNode;
  identity: AdminIdentity;
}>) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin/notes/")) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <a
        className="fixed top-2 left-2 z-70 -translate-y-[calc(100%+1rem)] rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground no-underline shadow-sm transition-transform duration-(--motion-duration) ease-(--motion-easing) focus-visible:translate-y-0 motion-reduce:transition-none"
        href="#admin-main"
      >
        跳到后台主要内容
      </a>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:px-4">
        <Link
          className="flex min-w-0 items-baseline gap-2 text-foreground no-underline"
          href="/admin"
        >
          <span
            className="truncate text-sm font-semibold tracking-[-0.02em]"
            lang="en"
          >
            CQ’s Lab
          </span>
          <span
            className="shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase"
            lang="en"
          >
            Admin
          </span>
        </Link>
        <Link
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground no-underline"
          href="/"
          target="_blank"
          lang="en"
        >
          <span className="hidden sm:inline">Site</span>
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
          <span className="sr-only sm:hidden">Site</span>
        </Link>

        <nav
          aria-label="后台导航"
          className="ml-auto flex items-center gap-1"
        >
          {adminNavigationItems.map((item) => {
            const Icon = navigationIcons[item.icon];
            const active = isAdminNavigationItemActive(pathname, item.href);

            return (
              <Link
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2.5 text-sm font-medium no-underline transition-[color,background-color] duration-(--motion-duration) ease-(--motion-easing) hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground motion-reduce:transition-none",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
                href={item.href}
                key={item.href}
                lang="en"
              >
                <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-xs font-medium">{identity.name}</p>
            <p className="mt-0.5 max-w-56 truncate text-[0.6875rem] text-muted-foreground">
              {identity.email}
            </p>
          </div>
        </div>
      </header>

      <main
        className="mt-14 h-[calc(100dvh-3.5rem)] overflow-y-auto"
        id="admin-main"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
