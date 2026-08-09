import type { PublishedArticleSummary } from "@/features/articles/article-dto";

export type PublicHomeNowContent = Readonly<{
  markdown: string;
  updatedDateTime: string;
  updatedLabel: string;
}>;

export type PublicHomeAboutContent = Readonly<{
  markdown: string;
}>;

export type PublicHomeContent = Readonly<{
  about: PublicHomeAboutContent;
  latestNotes: readonly PublishedArticleSummary[];
  now: PublicHomeNowContent;
}>;

export const publicHomeNowFallback: PublicHomeNowContent = {
  markdown:
    "最近在系统梳理 React、Next.js 与 AI Native 开发，同时完善这个网站的内容管理和发布流程。",
  updatedDateTime: "2026-08",
  updatedLabel: "2026.08",
};

export const publicHomeAboutFallback: PublicHomeAboutContent = {
  markdown: `我是一名软件工程师，主要从事 Web 产品与系统开发。

我关注软件工程、系统设计和 AI Native 开发，这个网站用于整理学习笔记，记录实践经验以及一些工作和生活中的思考。

目前在南京，正在关注合适的前端工程师相关机会。`,
};

export function formatPublicHomeUpdatedAt(
  updatedAt: string,
): Pick<PublicHomeNowContent, "updatedDateTime" | "updatedLabel"> | null {
  const date = new Date(updatedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const dateParts = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  }).formatToParts(date);
  const month = dateParts.find((part) => part.type === "month")?.value;
  const year = dateParts.find((part) => part.type === "year")?.value;

  if (!month || !year) {
    return null;
  }

  return {
    updatedDateTime: `${year}-${month}`,
    updatedLabel: `${year}.${month}`,
  };
}

export function selectPublicHomeLatestNotes(
  publishedArticles: readonly PublishedArticleSummary[],
  pinnedNoteIds: readonly string[],
  displayLimit: number,
): readonly PublishedArticleSummary[] {
  if (!Number.isSafeInteger(displayLimit) || displayLimit < 1) {
    return [];
  }

  const eligibleArticlesById = new Map(
    publishedArticles.map((article) => [article.id, article]),
  );
  const selectedArticles: PublishedArticleSummary[] = [];
  const selectedIds = new Set<string>();

  for (const noteId of pinnedNoteIds) {
    const article = eligibleArticlesById.get(noteId);

    if (!article || selectedIds.has(noteId)) {
      continue;
    }

    selectedArticles.push(article);
    selectedIds.add(noteId);

    if (selectedArticles.length === displayLimit) {
      return selectedArticles;
    }
  }

  for (const article of publishedArticles) {
    if (selectedIds.has(article.id)) {
      continue;
    }

    selectedArticles.push(article);
    selectedIds.add(article.id);

    if (selectedArticles.length === displayLimit) {
      break;
    }
  }

  return selectedArticles;
}
