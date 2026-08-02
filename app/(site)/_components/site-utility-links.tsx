"use client";

import { LayoutDashboardIcon } from "lucide-react";
import Link from "next/link";
import type { SVGProps } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const utilityLinkClassName =
  "inline-flex size-11 items-center justify-center rounded-md text-muted-foreground no-underline transition-[color,background-color] duration-[140ms] ease-[ease] hover:bg-brand-accent-soft hover:text-brand-accent focus-visible:bg-brand-accent-soft focus-visible:text-brand-accent motion-reduce:transition-none";

function GitHubMarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.465-2.381 1.235-3.221-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.911 1.23 3.221 0 4.61-2.805 5.625-5.475 5.921.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.3 24 12 24 5.373 18.627 0 12 0Z" />
    </svg>
  );
}

export function SiteUtilityLinks() {
  return (
    <>
      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />
      <TooltipProvider delay={350}>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  aria-label="前往 GitHub"
                  className={utilityLinkClassName}
                  href="https://github.com/bangbangde"
                  rel="noopener noreferrer"
                  target="_blank"
                  title="GitHub"
                />
              }
            >
              <GitHubMarkIcon aria-hidden="true" className="size-[1.125rem]" />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              GitHub
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  aria-label="进入管理后台"
                  className={utilityLinkClassName}
                  href="/admin"
                  title="管理后台"
                />
              }
            >
              <LayoutDashboardIcon
                aria-hidden="true"
                className="size-[1.125rem]"
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              管理后台
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </>
  );
}
