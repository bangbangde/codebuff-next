import type { Metadata } from "next";
import { Suspense } from "react";

import { homeContentService } from "@/features/home-content/server/home-content-service";
import { listPublishedArticles } from "@/features/articles/server/article-service";
import { requireAdmin } from "@/lib/auth/session";
import { AboutForm, LatestNotesForm, NowForm } from "./_components/home-content-forms";
import {
  createAdminHomeLatestNotesViewModel,
  type AdminHomeLatestNotesViewModel,
} from "./view-model";

export const metadata: Metadata = {
  title: "首页内容",
  description: "管理公开首页的 Now、Latest Notes 与 About。",
};

function SectionLoading({ title }: { title: string }) {
  return (
    <section
      aria-label={`正在载入 ${title}`}
      className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
      role="status"
    >
      <div className="border-b border-border bg-muted/35 px-5 py-5 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-muted motion-reduce:animate-none" />
      </div>
      <div className="px-5 py-6 sm:px-6">
        <div className="h-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      </div>
      <span className="sr-only">正在载入…</span>
    </section>
  );
}

function SectionLoadError({ title }: { title: string }) {
  return (
    <section
      aria-labelledby={`home-${title.toLowerCase().replaceAll(" ", "-")}-load-error`}
      className="rounded-lg border border-destructive/30 bg-card px-5 py-6 text-card-foreground sm:px-6"
    >
      <h2
        className="text-lg font-semibold"
        id={`home-${title.toLowerCase().replaceAll(" ", "-")}-load-error`}
        lang="en"
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-destructive" role="alert">
        此板块暂时无法载入。请刷新页面后重试，其他板块仍可独立使用。
      </p>
    </section>
  );
}

async function NowSection() {
  let markdown: string;

  try {
    const section = await homeContentService.getNowSection();
    markdown = section?.markdown ?? "";
  } catch (error) {
    console.error("Failed to load home Now section.", error);
    return <SectionLoadError title="Now" />;
  }

  return <NowForm initialMarkdown={markdown} />;
}

async function LatestNotesSection() {
  let viewModel: AdminHomeLatestNotesViewModel;

  try {
    const [config, publishedArticles] = await Promise.all([
      homeContentService.getLatestNotesConfig(),
      listPublishedArticles(),
    ]);
    viewModel = createAdminHomeLatestNotesViewModel(
      config,
      publishedArticles,
    );
  } catch (error) {
    console.error("Failed to load home Latest Notes section.", error);
    return <SectionLoadError title="Latest Notes" />;
  }

  return <LatestNotesForm viewModel={viewModel} />;
}

async function AboutSection() {
  let markdown: string;

  try {
    const section = await homeContentService.getAboutSection();
    markdown = section?.markdown ?? "";
  } catch (error) {
    console.error("Failed to load home About section.", error);
    return <SectionLoadError title="About" />;
  }

  return <AboutForm initialMarkdown={markdown} />;
}

export default async function AdminHomePage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:py-12">
      <header>
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.035em] sm:text-[1.75rem]">
          首页内容
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          三个板块各自载入、校验与保存；单个板块的失败不会覆盖其他板块的状态。
        </p>
      </header>

      <div className="mt-7 grid gap-6 sm:mt-8">
        <Suspense fallback={<SectionLoading title="Now" />}>
          <NowSection />
        </Suspense>
        <Suspense fallback={<SectionLoading title="Latest Notes" />}>
          <LatestNotesSection />
        </Suspense>
        <Suspense fallback={<SectionLoading title="About" />}>
          <AboutSection />
        </Suspense>
      </div>
    </div>
  );
}
