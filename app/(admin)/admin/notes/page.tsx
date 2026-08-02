import {
  FileTextIcon,
  PlusIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { listArticleSummaries } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { createDraftAction } from "./actions";

export const metadata: Metadata = {
  title: "Notes",
  description: "查看与管理存储在 PostgreSQL 中的笔记。",
};

type ArticleTab = "drafts" | "published";

function resolveTab(value: string | string[] | undefined): ArticleTab {
  return value === "published" ? "published" : "drafts";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

const tabClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium no-underline transition-[color,background-color] duration-(--motion-duration) ease-(--motion-easing) motion-reduce:transition-none";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    deleted?: string | string[];
    tab?: string | string[];
  }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const activeTab = resolveTab(query.tab);

  const allArticles = await listArticleSummaries();
  const drafts = allArticles.filter((article) => article.publishedAt === null);
  const published = allArticles.filter(
    (article) => article.publishedAt !== null,
  );
  const visibleArticles = activeTab === "drafts" ? drafts : published;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="笔记视图" className="flex items-center gap-1">
          <Link
            aria-current={activeTab === "drafts" ? "page" : undefined}
            className={cn(
              tabClassName,
              activeTab === "drafts"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
            )}
            href="/admin/notes?tab=drafts"
            lang="en"
          >
            Drafts
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                activeTab === "drafts"
                  ? "bg-background/60 text-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {drafts.length}
            </span>
          </Link>
          <Link
            aria-current={activeTab === "published" ? "page" : undefined}
            className={cn(
              tabClassName,
              activeTab === "published"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
            )}
            href="/admin/notes?tab=published"
            lang="en"
          >
            Published
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                activeTab === "published"
                  ? "bg-background/60 text-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {published.length}
            </span>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <form action={createDraftAction}>
            <Button type="submit">
              <PlusIcon aria-hidden="true" />
              <span className="hidden sm:inline">创建笔记</span>
              <span className="sr-only sm:hidden">创建笔记</span>
            </Button>
          </form>
        </div>
      </div>

      <section aria-labelledby="note-list-title" className="pt-6">
        <h2 className="sr-only" id="note-list-title">
          {activeTab === "drafts" ? "草稿箱笔记列表" : "已发布笔记列表"}
        </h2>

        {visibleArticles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted px-5 py-10 sm:px-8 sm:py-12">
            <FileTextIcon
              aria-hidden="true"
              className="size-6 text-brand-accent"
            />
            <h3 className="mt-5 text-base font-semibold">
              {activeTab === "drafts" ? "草稿箱为空" : "还没有已发布笔记"}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {activeTab === "drafts"
                ? "数据库中暂无未发布笔记。创建第一篇草稿，开始撰写内容。"
                : "暂无已发布笔记。在草稿箱中编辑并发布后，会出现在这里。"}
            </p>
            {activeTab === "drafts" ? (
              <form action={createDraftAction} className="mt-6">
                <Button size="sm" type="submit" variant="outline">
                  <PlusIcon aria-hidden="true" />
                  创建第一篇草稿
                </Button>
              </form>
            ) : null}
          </div>
        ) : (
          <ol className="divide-y divide-border border-y border-border">
            {visibleArticles.map((article) => (
              <li
                className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8"
                key={article.id}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">
                    <Link
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      href={`/admin/notes/${article.id}`}
                    >
                      {article.draftTitle.length > 0
                        ? article.draftTitle
                        : "（未命名草稿）"}
                    </Link>
                  </h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground sm:flex-col sm:items-end sm:gap-1">
                  <time
                    dateTime={
                      activeTab === "published"
                        ? (article.publishedAt as string)
                        : article.draftUpdatedAt
                    }
                  >
                    {activeTab === "published"
                      ? formatDate(article.publishedAt as string)
                      : formatDate(article.draftUpdatedAt)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
