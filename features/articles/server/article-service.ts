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

export function updateArticle(input: UpdateArticleInput) {
  return drizzleArticleRepository.update(
    input,
    parseCanonicalAssetReferenceIds(input.bodyMarkdown),
  );
}

export async function publishArticle(
  input: PublishArticleInput,
): Promise<PublishArticleResult> {
  const current = await drizzleArticleRepository.findById(input.id);
  const assetIds = new Set<string>([input.coverAssetId]);

  if (current) {
    for (const assetId of parseCanonicalAssetReferenceIds(current.draftContent)) {
      assetIds.add(assetId);
    }
  }

  return drizzleArticleRepository.publish(input, [...assetIds]);
}

export function listPublishedArticles(): Promise<readonly PublishedArticleSummary[]> {
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
