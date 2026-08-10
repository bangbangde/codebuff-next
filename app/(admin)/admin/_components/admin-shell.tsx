"use client";

import { ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import logo from "@/assets/brand/logo.svg";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAccountMenu } from "./admin-account-menu";
import {
  adminNavigationItems,
  isAdminNavigationItemActive,
} from "./admin-navigation";

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
  const router = useRouter();

  if (pathname.startsWith("/admin/notes/")) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {children}
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto bg-background text-foreground">
      <a
        className="fixed top-2 left-2 z-70 -translate-y-[calc(100%+1rem)] rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground no-underline shadow-sm transition-transform duration-(--motion-duration) ease-(--motion-easing) focus-visible:translate-y-0 motion-reduce:transition-none"
        href="#admin-main"
      >
        跳到后台主要内容
      </a>

      <header
        className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:px-4"
        style={
          {
            "--admin-content-left":
              "max(2rem, calc((100% - 72rem) / 2 + 2rem))",
          } as React.CSSProperties
        }
      >
        <Link
          aria-label="CQ’s Lab Admin 首页"
          className="flex min-w-0 items-center gap-2 text-foreground no-underline"
          href="/admin"
        >
          <Image
            alt=""
            aria-hidden="true"
            className="block size-8 shrink-0"
            height={32}
            src={logo}
            unoptimized
            width={32}
          />
          <span
            className="hidden truncate text-sm font-semibold tracking-[-0.02em] sm:inline"
            lang="en"
          >
            CQ’s Lab
          </span>
          <span
            className="shrink-0 rounded-md bg-brand-accent px-2 py-1 font-mono text-[0.625rem] leading-none font-semibold tracking-[0.08em] text-primary-foreground uppercase"
            lang="en"
          >
            Admin
          </span>
        </Link>
        <Link
          aria-label="在新标签页打开公开网站"
          className={buttonVariants({
            className: "ml-1",
            size: "sm",
            variant: "outline",
          })}
          href="/"
          target="_blank"
        >
          <span className="hidden sm:inline" lang="en">
            Site
          </span>
          <ExternalLinkIcon aria-hidden="true" />
        </Link>

        <Tabs
          aria-label="后台导航"
          className="ml-1 min-[100rem]:absolute min-[100rem]:left-(--admin-content-left) min-[100rem]:ml-0"
          onValueChange={(value) => {
            if (typeof value === "string") {
              router.push(value);
            }
          }}
          value={
            adminNavigationItems.find((item) =>
              isAdminNavigationItemActive(pathname, item.href),
            )?.href ?? null
          }
        >
          <TabsList
            aria-label="后台主菜单"
            className="h-11 p-0"
            variant="line"
          >
            {adminNavigationItems.map((item) => (
              <TabsTrigger
                className="h-11 min-h-11 min-w-11 px-3"
                key={item.href}
                lang={item.lang}
                value={item.href}
              >
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="ml-auto">
          <AdminAccountMenu email={identity.email} name={identity.name} />
        </div>
      </header>

      <main
        className="min-h-[calc(100dvh-3.5rem)]"
        id="admin-main"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
