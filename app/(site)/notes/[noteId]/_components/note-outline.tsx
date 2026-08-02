"use client";

import { useEffect, useState } from "react";

import type { MarkdownOutlineItem } from "@/lib/content/markdown-outline";

const ACTIVE_HEADING_OFFSET = 128;

function OutlineLinks({
  activeId,
  onNavigate,
  outline,
  variant,
}: {
  activeId: string | null;
  onNavigate: (id: string) => void;
  outline: readonly MarkdownOutlineItem[];
  variant: "desktop" | "mobile";
}) {
  return (
    <ol className="mt-3 grid gap-0.5">
      {outline.map((item) => {
        const isActive = item.id === activeId;

        return (
          <li
            className={
              variant === "mobile" && item.depth === 3 ? "pl-4" : undefined
            }
            key={item.id}
          >
            <a
              aria-current={isActive ? "location" : undefined}
              className={`relative flex min-h-9 items-center rounded-sm py-1.5 text-sm leading-5 underline-offset-4 transition-colors duration-[140ms] focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none [@media(max-width:80rem)]:min-h-11 ${
                variant === "desktop"
                  ? item.depth === 3
                    ? "pr-3 pl-10"
                    : "pr-3 pl-6"
                  : "border-l-2 px-3"
              } ${
                isActive
                  ? variant === "desktop"
                    ? "text-brand-accent before:absolute before:inset-y-0 before:-left-px before:w-0.5 before:bg-brand-accent"
                    : "border-brand-accent text-brand-accent"
                  : variant === "desktop"
                    ? "text-muted-foreground hover:text-brand-accent hover:underline"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-brand-accent hover:underline"
              }`}
              href={`#${item.id}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function NoteOutline({
  outline,
}: {
  outline: readonly MarkdownOutlineItem[];
}) {
  const [activeId, setActiveId] = useState<string | null>(
    outline[0]?.id ?? null,
  );

  useEffect(() => {
    const headings = outline
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null);

    if (headings.length === 0) {
      return;
    }

    let animationFrame = 0;

    const updateActiveHeading = () => {
      animationFrame = 0;
      const documentBottom =
        Math.ceil(window.scrollY + window.innerHeight) >=
        document.documentElement.scrollHeight - 2;
      let nextId = headings[0].id;

      if (documentBottom) {
        nextId = headings[headings.length - 1].id;
      } else {
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top > ACTIVE_HEADING_OFFSET) {
            break;
          }

          nextId = heading.id;
        }
      }

      setActiveId((currentId) =>
        currentId === nextId ? currentId : nextId,
      );
    };

    const requestUpdate = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateActiveHeading);
      }
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", requestUpdate);

    return () => {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("hashchange", requestUpdate);
    };
  }, [outline]);

  return (
    <>
      <details className="group mb-9 border-y border-border py-2 xl:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center font-mono text-xs tracking-label text-foreground uppercase marker:text-brand-accent">
          目录
        </summary>
        <nav aria-label="文章目录" className="pb-3">
          <OutlineLinks
            activeId={activeId}
            onNavigate={setActiveId}
            outline={outline}
            variant="mobile"
          />
        </nav>
      </details>

      <aside className="sticky top-24 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto border-l border-border xl:col-start-2 xl:row-start-1 xl:block">
        <nav aria-label="文章目录">
          <p className="m-0 pl-6 font-mono text-xs tracking-label text-brand-accent uppercase">
            目录
          </p>
          <OutlineLinks
            activeId={activeId}
            onNavigate={setActiveId}
            outline={outline}
            variant="desktop"
          />
        </nav>
      </aside>
    </>
  );
}
