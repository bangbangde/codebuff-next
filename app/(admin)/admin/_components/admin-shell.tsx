"use client";

import {
  ExternalLinkIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  adminNavigationItems,
  isAdminNavigationItemActive,
} from "./admin-navigation";

const navigationIcons = {
  account: UserRoundIcon,
  articles: FileTextIcon,
  overview: LayoutDashboardIcon,
} as const;

type AdminIdentity = {
  email: string;
  name: string;
};

function AdminNavigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <TooltipProvider delay={350}>
      <nav aria-label="Admin navigation" className="grid gap-1">
        {adminNavigationItems.map((item) => {
          const Icon = navigationIcons[item.icon];
          const active = isAdminNavigationItemActive(pathname, item.href);

          return (
            <Tooltip disabled={!collapsed} key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    aria-current={active ? "page" : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground no-underline transition-[color,background-color] duration-(--motion-duration) ease-(--motion-easing) hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground motion-reduce:transition-none",
                      active &&
                        "bg-accent text-accent-foreground shadow-[inset_3px_0_0_var(--brand-accent)]",
                      collapsed && "justify-center px-0",
                    )}
                    href={item.href}
                    onClick={onNavigate}
                  />
                }
              >
                <Icon aria-hidden="true" className="size-[1.125rem] shrink-0" />
                <span className={cn(collapsed && "sr-only")}>{item.label}</span>
              </TooltipTrigger>
              {collapsed ? <TooltipContent>{item.label}</TooltipContent> : null}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}

function MobileNavigation({
  identity,
  onNavigate,
}: {
  identity: AdminIdentity;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex min-h-14 items-center justify-between border-b border-border px-4">
        <DialogTitle className="flex items-baseline gap-2">
          <span className="text-sm font-semibold tracking-[-0.02em]">
            CQ&apos;s Lab
          </span>
          <span className="font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
            Admin
          </span>
        </DialogTitle>
        <Button
          aria-label="Close navigation"
          className="size-11"
          onClick={onNavigate}
          size="icon-lg"
          title="Close navigation"
          variant="ghost"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
      <div className="overflow-y-auto px-3 py-4">
        <AdminNavigation onNavigate={onNavigate} />
      </div>
      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-sm font-medium">{identity.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {identity.email}
        </p>
      </div>
    </>
  );
}

export function AdminShell({
  children,
  identity,
}: Readonly<{
  children: React.ReactNode;
  identity: AdminIdentity;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <a
        className="fixed top-2 left-2 z-70 -translate-y-[calc(100%+1rem)] rounded-md border border-border bg-popover px-3 py-2 text-sm font-medium text-popover-foreground no-underline shadow-sm transition-transform duration-(--motion-duration) ease-(--motion-easing) focus-visible:translate-y-0 motion-reduce:transition-none"
        href="#admin-main"
      >
        Skip to Admin content
      </a>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-border bg-background/95 px-3 backdrop-blur-sm supports-backdrop-filter:bg-background/85 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Dialog
            onOpenChange={setMobileNavigationOpen}
            open={mobileNavigationOpen}
          >
            <DialogTrigger
              render={
                <Button
                  aria-label="Open navigation"
                  className="size-11 lg:hidden"
                  size="icon-lg"
                  title="Open navigation"
                  variant="ghost"
                />
              }
            >
              <MenuIcon aria-hidden="true" />
            </DialogTrigger>
            <DialogContent
              className="top-0 left-0 h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none -translate-x-0 -translate-y-0 grid-rows-[auto_1fr_auto] gap-0 rounded-none border-r border-border p-0 ring-0 data-closed:slide-out-to-left data-closed:zoom-out-100 data-open:slide-in-from-left data-open:zoom-in-100 sm:max-w-none"
              showCloseButton={false}
            >
              <MobileNavigation
                identity={identity}
                onNavigate={() => setMobileNavigationOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            aria-controls="admin-sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden size-11 lg:inline-flex"
            onClick={() => setCollapsed((current) => !current)}
            size="icon-lg"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            variant="ghost"
          >
            {collapsed ? (
              <PanelLeftOpenIcon aria-hidden="true" />
            ) : (
              <PanelLeftCloseIcon aria-hidden="true" />
            )}
          </Button>

          <Link
            className="flex min-w-0 items-baseline gap-2 text-foreground no-underline"
            href="/admin"
          >
            <span className="truncate text-sm font-semibold tracking-[-0.02em]">
              CQ&apos;s Lab
            </span>
            <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.08em] text-muted-foreground uppercase">
              Admin
            </span>
          </Link>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <Link
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-2.5 text-xs font-medium text-muted-foreground no-underline transition-colors duration-(--motion-duration) ease-(--motion-easing) hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground motion-reduce:transition-none sm:min-w-0"
            href="/"
          >
            <span className="hidden sm:inline">View site</span>
            <ExternalLinkIcon aria-hidden="true" className="size-4" />
            <span className="sr-only sm:hidden">View site</span>
          </Link>
          <div className="hidden min-w-0 text-right md:block">
            <p className="truncate text-xs font-medium">{identity.name}</p>
            <p className="mt-0.5 max-w-56 truncate text-[0.6875rem] text-muted-foreground">
              {identity.email}
            </p>
          </div>
        </div>
      </header>

      <aside
        className={cn(
          "fixed top-14 bottom-0 left-0 z-30 hidden border-r border-border bg-card px-3 py-4 text-card-foreground transition-[width] duration-(--motion-duration) ease-(--motion-easing) lg:block motion-reduce:transition-none",
          collapsed ? "w-18" : "w-64",
        )}
        id="admin-sidebar"
      >
        <AdminNavigation collapsed={collapsed} />
      </aside>

      <main
        className={cn(
          "mt-14 h-[calc(100dvh-3.5rem)] overflow-y-auto transition-[padding] duration-(--motion-duration) ease-(--motion-easing) motion-reduce:transition-none",
          collapsed ? "lg:pl-18" : "lg:pl-64",
        )}
        id="admin-main"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
