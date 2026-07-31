import "server-only";

import {
  deleteArticleAssetObjectsByKeys,
  listArticleAssetObjectKeys,
} from "@/features/article-assets/server/article-asset-service";
import type {
  CategoryOption,
  DeleteArticleInput,
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

export function publishArticle(
  input: PublishArticleInput,
): Promise<PublishArticleResult> {
  return drizzleArticleRepository.publish(input, [input.coverAssetId]);
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

export async function deleteArticle(input: DeleteArticleInput) {
  // 必须在删除文章之前抓取 object keys：article_asset 行会随 article 一起
  // 被 ON DELETE cascade 移除，删除之后再查会得到空列表，导致 Garage 对象
  // 全部成为永久孤儿。此处存在温和 TOCTOU（抓取 keys 后到删除文章前若有
  // 新资产上传，其对象不会被清理），符合"接受孤儿"约定，不引入事务复杂度。
  const objectKeys = await listArticleAssetObjectKeys(input.id);

  const result = await drizzleArticleRepository.delete(input);

  if (result.status === "deleted" && objectKeys.length > 0) {
    await deleteArticleAssetObjectsByKeys(objectKeys);
  }

  return result;
}
