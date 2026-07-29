import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/session";
import { ArticleCreateForm } from "./_components/article-create-form";

export const metadata: Metadata = {
  title: "New article",
  description: "Create an unpublished PostgreSQL-backed article.",
};

export default async function NewArticlePage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground no-underline transition-colors duration-(--motion-duration) ease-(--motion-easing) hover:text-foreground focus-visible:text-foreground motion-reduce:transition-none"
        href="/admin/articles"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        返回文章列表
      </Link>

      <header className="mt-6 max-w-3xl">
        <p className="font-mono text-xs tracking-[0.1em] text-brand-accent uppercase">
          Admin / Articles / New
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          创建文章
        </h1>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-7 text-muted-foreground sm:text-base">
          内容只会保存到 PostgreSQL，并保持未发布状态。公开展示、预览与发布流程不在当前阶段。
        </p>
      </header>

      <ArticleCreateForm />
    </div>
  );
}
