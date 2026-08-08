import "server-only";

import type {
  CategoryOption,
  PublishArticleInput,
  PublishArticleResult,
  PublishedArticleDetail,
  PublishedArticleSummary,
  TagOption,
  UpdateArticleInput,
} from "../article-dto";
import { parseCanonicalAssetReferenceIds } from "../article-asset-reference";
import { drizzleArticleRepository } from "./drizzle-article-repository";
import { cleanupArticleAssets } from "@/features/article-assets/server/article-asset-cleanup-service";

export function createDraft() {
  return drizzleArticleRepository.createDraft();
}

export function listArticleSummaries() {
  return drizzleArticleRepository.listSummaries();
}

export function listCategories(): Promise<readonly CategoryOption[]> {
  return drizzleArticleRepository.listCategories();
}

export function listTags(): Promise<readonly TagOption[]> {
  return drizzleArticleRepository.listTags();
}

export function getArticleById(id: string) {
  return drizzleArticleRepository.findById(id);
}

export async function updateArticle(input: UpdateArticleInput) {
  const result = await drizzleArticleRepository.update(
    input,
    parseCanonicalAssetReferenceIds(input.bodyMarkdown),
  );
  cleanupArticleAssets().catch(() => {});
  return result;
}

export function publishArticle(
  input: PublishArticleInput,
): Promise<PublishArticleResult> {
  // 资产引用解析与校验在 repository 事务内完成（SELECT FOR UPDATE 锁行后
  // 读取 draftContent 快照），避免事务外读取导致校验过期。
  return drizzleArticleRepository.publish(input);
}

export function listPublishedArticles(): Promise<
  readonly PublishedArticleSummary[]
> {
  return drizzleArticleRepository.listPublishedArticles();
}

export function getPublishedArticle(
  id: string,
): Promise<PublishedArticleDetail | null> {
  return drizzleArticleRepository.getPublishedArticle(id);
}

export function isArticlePublished(id: string): Promise<boolean> {
  return drizzleArticleRepository.isArticlePublished(id);
}
